import { AlertTriangle, Crown, ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';
import { cn } from '@/lib/utils';

interface PlanBannerProps {
  className?: string;
}

/**
 * Banner de aviso de limite de membros.
 * Mostra quando o uso está acima de 80% ou quando o limite foi atingido.
 */
export function PlanBanner({ className }: PlanBannerProps) {
  const { plan, label, maxMembers, currentMembers, isLimitReached, percentUsed, status, loading } = useSubscriptionPlan();

  if (loading) return null;
  if (status === null) return null;
  // Só exibe se uso >= 75%
  if (percentUsed < 75 && !isLimitReached) return null;
  // Superadmin e enterprise não precisam ver
  if (plan === 'enterprise') return null;

  const isWarning = percentUsed >= 75 && !isLimitReached;
  const isCritical = isLimitReached;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4',
        isCritical
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={cn('p-2 rounded-full', isCritical ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-900/30')}>
          {isCritical ? <AlertTriangle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        </div>
        <div className="space-y-1 flex-1">
          <p className="font-bold text-sm">
            {isCritical
              ? `Limite do Plano ${label} atingido!`
              : `Você está usando ${percentUsed}% do seu plano`}
          </p>
          <p className="text-xs opacity-80">
            {currentMembers} de {maxMembers} membros utilizados
          </p>
          <Progress value={percentUsed} className="h-1.5 mt-1" />
        </div>
      </div>

      <Link to="/checkout" className="shrink-0">
        <Button
          size="sm"
          className={cn(
            'gap-2 font-bold',
            isCritical
              ? 'bg-destructive hover:bg-destructive/90 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          )}
        >
          <Crown className="h-4 w-4" />
          Fazer Upgrade
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

/**
 * Componente de bloqueio para ações que requerem upgrade de plano.
 * Use ao redor de botões/formulários que criam membros quando o limite foi atingido.
 */
export function MemberLimitGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isLimitReached, label, maxMembers, plan, loading } = useSubscriptionPlan();

  if (loading) return <>{children}</>;
  if (!isLimitReached) return <>{children}</>;
  if (plan === 'enterprise') return <>{children}</>;

  return (
    <>
      {fallback ?? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <p className="font-black text-lg text-destructive">Limite do Plano {label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você atingiu o limite de <strong>{maxMembers} membros</strong> do seu plano atual.
              Faça upgrade para continuar adicionando membros.
            </p>
          </div>
          <Link to="/checkout">
            <Button className="gap-2 bg-primary hover:bg-primary/90 font-bold">
              <Crown className="h-4 w-4" />
              Fazer Upgrade Agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
