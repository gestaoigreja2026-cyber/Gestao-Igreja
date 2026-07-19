import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { createElement } from 'react';
import { churchesService, Church } from '@/services/churches.service';

const MAIN_DOMAIN = 'church-gest-oficial.com.br';

// ─── Global singleton (para Logo.tsx antes do React montar) ────
export let globalChurchLogo: string | null = null;
export let globalChurchName: string | null = null;
export let globalChurchThemeColor: string | null = null;
export let globalChurchBanner: string | null = null;

// ─── Context ─────────────────────────────────────────────────────────────────
interface TenantContextValue {
  tenant: Church | null;
  loading: boolean;
  isMainDomain: boolean;
  subdomain: string | null;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  isMainDomain: false,
  subdomain: null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractSlug(): string | null {
  const host = window.location.hostname;

  // Parâmetro de URL para testes locais: ?slug=ibma ou ?church=ibma
  const urlParams = new URLSearchParams(window.location.search);
  const slugParam = urlParams.get('slug') || urlParams.get('church');
  if (slugParam) return slugParam;

  // localhost / 127.0.0.1 sem subdomínio → domínio principal
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  if (isLocal) return null;

  // Domínio principal
  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) return null;

  // Subdomínio do domínio principal: batista.church-gest-oficial.com.br
  if (host.endsWith(MAIN_DOMAIN)) {
    const slug = host.replace(`.${MAIN_DOMAIN}`, '').split('.').pop() || '';
    return slug && slug !== 'www' ? slug : null;
  }

  // Domínio customizado: o primeiro segmento pode ser www → ignorar
  const first = host.split('.')[0];
  return first && first !== 'www' ? first : null;
}

function applyBranding(church: Church) {
  // Título da aba
  if (church.name) {
    document.title = church.name;
    globalChurchName = church.name;
  }

  if (church.logo_url) {
    globalChurchLogo = church.logo_url;

    // Favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (favicon) favicon.href = church.logo_url;

    // Apple touch icon
    const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (apple) apple.href = church.logo_url;

    // Imagens de logo já renderizadas
    document.querySelectorAll<HTMLImageElement>('img.church-logo, img[src*="logo-app"]').forEach((img) => {
      img.src = church.logo_url!;
    });

    // Evento para Logo.tsx (componentes React já montados)
    window.dispatchEvent(new CustomEvent('churchLogoUpdated', { detail: church.logo_url }));
  }

  // Banner de culto
  if (church.banner_url) {
    globalChurchBanner = church.banner_url;
    // Evento para banner atualizado
    window.dispatchEvent(new CustomEvent('churchBannerUpdated', { detail: church.banner_url }));
  }

  // theme-color meta tag (cor primária da igreja)
  const themeColor = church.theme_color || '#2563eb';
  globalChurchThemeColor = themeColor;
  const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (themeMeta) themeMeta.content = themeColor;

  // Dispara evento geral de branding atualizado
  window.dispatchEvent(new CustomEvent('churchBrandingUpdated', {
    detail: { name: church.name, logo: church.logo_url, banner: church.banner_url, themeColor },
  }));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
const _providerInitialized = false;
let _cachedTenant: Church | null = null;
let _cachedSlug: string | null = null;
let _cachedIsMain = false;
const _pendingCallbacks: Array<(v: TenantContextValue) => void> = [];
let _resolved = false;

/**
 * Invalida o cache do tenant e força o re-fetch na próxima renderização.
 * Use após atualizar logo_url ou banner_url no banco.
 */
export function invalidateTenantCache() {
  _resolved = false;
  _cachedTenant = null;
}

async function resolveTenant(): Promise<TenantContextValue> {
  if (_resolved) {
    return { tenant: _cachedTenant, loading: false, isMainDomain: _cachedIsMain, subdomain: _cachedSlug };
  }

  const slug = extractSlug();
  _cachedSlug = slug;

  if (!slug) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      try {
        const { data: churches } = await supabase.from('churches').select('*').limit(1);
        if (churches && churches.length > 0) {
          const church = churches[0];
          _cachedTenant = church;
          _cachedSlug = church.slug;
          applyBranding(church);
          _resolved = true;
          return { tenant: _cachedTenant, loading: false, isMainDomain: false, subdomain: church.slug };
        }
      } catch (e) {
        console.warn('Erro ao buscar igreja fallback local', e);
      }
    }

    _cachedIsMain = true;
    _resolved = true;
    return { tenant: null, loading: false, isMainDomain: true, subdomain: null };
  }

  try {
    const church = await churchesService.getBySlug(slug);
    if (church) {
      _cachedTenant = church;
      applyBranding(church);
    } else {
      _cachedIsMain = true;
    }
  } catch (err) {
    console.error('[useTenant] Erro ao buscar tenant:', err);
    _cachedIsMain = true;
  }

  _resolved = true;
  return { tenant: _cachedTenant, loading: false, isMainDomain: _cachedIsMain, subdomain: slug };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<TenantContextValue>({
    tenant: _cachedTenant,
    loading: !_resolved,
    isMainDomain: _cachedIsMain,
    subdomain: _cachedSlug,
  });

  useEffect(() => {
    if (_resolved) return; // já resolvido por outra instância
    resolveTenant().then(setValue);
  }, []);

  return createElement(TenantContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTenant() {
  return useContext(TenantContext);
}
