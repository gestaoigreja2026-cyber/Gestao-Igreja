import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'promo' | 'starter' | 'growth' | 'professional' | 'enterprise' | 'trial';

export const PROMO_MAX_CHURCHES = 20;
export const PROMO_MAX_MEMBERS = 300;

export interface PlanInfo {
  plan: PlanType;
  label: string;
  maxMembers: number;
  price: number;
  currentMembers: number;
  isLimitReached: boolean;
  percentUsed: number;
  status: 'ativa' | 'inadimplente' | 'cancelada' | 'trial' | null;
  loading: boolean;
}

export const PLAN_CONFIG: Record<PlanType, { label: string; maxMembers: number; price: number }> = {
  promo:        { label: 'Super Oferta (Até 300 membros)', maxMembers: PROMO_MAX_MEMBERS, price: 150 },
  starter:      { label: 'Starter',                        maxMembers: 100,               price: 199 },
  growth:       { label: 'Growth',                         maxMembers: 500,               price: 299 },
  professional: { label: 'Professional',                   maxMembers: 2000,              price: 499 },
  enterprise:   { label: 'Enterprise',                     maxMembers: 99999,             price: 1200 },
  trial:        { label: 'Trial',                          maxMembers: 30,                price: 0 },
};

/** Detecta qual plano corresponde ao valor de plan_amount e se está dentro do lote promocional de 20 igrejas */
function detectPlanByAmount(amount: number | null, status: string, isWithinFirst20Churches: boolean): PlanType {
  if (status === 'trial') return 'trial';
  if (amount !== null && amount <= 150) return 'promo';
  if (!amount) return isWithinFirst20Churches ? 'promo' : 'starter';
  if (amount <= 199) return 'starter';
  if (amount <= 299) return 'growth';
  if (amount <= 499) return 'professional';
  return 'enterprise';
}

const planCache = new Map<string, { data: PlanInfo; timestamp: number }>();
const PLAN_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

let promoStatusCache: { isPromoActive: boolean; churchCount: number; remainingSpots: number; timestamp: number } | null = null;

/**
 * Verifica se a promoção das 20 primeiras igrejas (até 300 membros) ainda está ativa.
 * Quando o total de igrejas atinge 20, retorna isPromoActive = false e volta para os planos padrão.
 */
export function usePromoStatus() {
  const [promo, setPromo] = useState<{
    isPromoActive: boolean;
    churchCount: number;
    remainingSpots: number;
    loading: boolean;
  }>(() => {
    if (promoStatusCache && Date.now() - promoStatusCache.timestamp < PLAN_CACHE_TTL_MS) {
      return { ...promoStatusCache, loading: false };
    }
    return {
      isPromoActive: true,
      churchCount: 0,
      remainingSpots: PROMO_MAX_CHURCHES,
      loading: true,
    };
  });

  useEffect(() => {
    if (promoStatusCache && Date.now() - promoStatusCache.timestamp < PLAN_CACHE_TTL_MS) {
      setPromo({ ...promoStatusCache, loading: false });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { count, error } = await supabase
          .from('churches')
          .select('*', { count: 'exact', head: true });

        const total = !error && typeof count === 'number' ? count : 0;
        const isPromoActive = total < PROMO_MAX_CHURCHES;
        const remainingSpots = Math.max(0, PROMO_MAX_CHURCHES - total);

        promoStatusCache = {
          isPromoActive,
          churchCount: total,
          remainingSpots,
          timestamp: Date.now(),
        };

        if (mounted) {
          setPromo({ isPromoActive, churchCount: total, remainingSpots, loading: false });
        }
      } catch {
        if (mounted) {
          setPromo(prev => ({ ...prev, loading: false }));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return promo;
}

export function useSubscriptionPlan(): PlanInfo {
  const { churchId } = useAuth();
  const [info, setInfo] = useState<PlanInfo>(() => {
    if (churchId) {
      const cached = planCache.get(churchId);
      if (cached && Date.now() - cached.timestamp < PLAN_CACHE_TTL_MS) {
        return cached.data;
      }
    }
    return {
      plan: 'starter',
      label: 'Starter',
      maxMembers: 100,
      price: 199,
      currentMembers: 0,
      isLimitReached: false,
      percentUsed: 0,
      status: null,
      loading: true,
    };
  });

  useEffect(() => {
    if (!churchId) {
      setInfo(prev => ({ ...prev, loading: false }));
      return;
    }

    const cached = planCache.get(churchId);
    if (cached && Date.now() - cached.timestamp < PLAN_CACHE_TTL_MS) {
      setInfo(cached.data);
      return;
    }

    const load = async () => {
      try {
        // Busca assinatura, contagem de membros ativos e as 20 primeiras igrejas em paralelo
        const [subRes, memberRes, first20Res] = await Promise.all([
          supabase
            .from('church_subscriptions')
            .select('status, plan_amount, subscription_plan')
            .eq('church_id', churchId)
            .maybeSingle(),
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('church_id', churchId)
            .eq('status', 'ativo'),
          supabase
            .from('churches')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(PROMO_MAX_CHURCHES),
        ]);

        const sub = subRes.data;
        const memberCount = memberRes.count;
        const first20Ids = (first20Res.data || []).map((c: any) => c.id);
        const isWithinFirst20Churches = first20Ids.includes(churchId);

        const status = (sub?.status ?? 'trial') as PlanInfo['status'];

        // Prioridade:
        // 1. Se status for 'trial', plano Trial (até 30 membros)
        // 2. Se subscription_plan for 'promo' ou 'super-oferta', ou se está entre as 20 primeiras igrejas com valor promocional (<= 150), plano Promo (até 300 membros)
        // 3. Caso contrário (ou após atingir 20 igrejas), usa os planos padrão (Trial: 30, Starter: 100, Growth: 500, Professional: 2000, Enterprise: 99999)
        let plan: PlanType;
        const rawPlan = sub?.subscription_plan as string | undefined;

        if (status === 'trial') {
          plan = 'trial';
        } else if (rawPlan === 'promo' || rawPlan === 'super-oferta') {
          plan = 'promo';
        } else if (
          isWithinFirst20Churches &&
          (!rawPlan || rawPlan === 'starter') &&
          (sub?.plan_amount === null || sub?.plan_amount === undefined || Number(sub?.plan_amount) <= 150)
        ) {
          plan = 'promo';
        } else if (rawPlan && PLAN_CONFIG[rawPlan as PlanType]) {
          plan = rawPlan as PlanType;
        } else {
          plan = detectPlanByAmount(
            sub?.plan_amount !== null && sub?.plan_amount !== undefined ? Number(sub.plan_amount) : null,
            status ?? 'trial',
            isWithinFirst20Churches
          );
        }

        const config = PLAN_CONFIG[plan];
        const current = memberCount ?? 0;
        const percentUsed = Math.min(100, Math.round((current / config.maxMembers) * 100));

        const nextInfo: PlanInfo = {
          plan,
          label: config.label,
          maxMembers: config.maxMembers,
          price: config.price,
          currentMembers: current,
          isLimitReached: current >= config.maxMembers,
          percentUsed,
          status,
          loading: false,
        };
        planCache.set(churchId, { data: nextInfo, timestamp: Date.now() });
        setInfo(nextInfo);
      } catch {
        setInfo(prev => ({ ...prev, loading: false }));
      }
    };

    load();
  }, [churchId]);

  return info;
}
