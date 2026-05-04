import { useState, useEffect } from 'react';
import { churchesService, Church } from '@/services/churches.service';

const MAIN_DOMAIN = 'church-gest-oficial.com.br';

export function useTenant() {
  const [tenant, setTenant] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMainDomain, setIsMainDomain] = useState(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    async function detectTenant() {
      try {
        const host = window.location.hostname;
        
        // 0. Suporte a ?slug= para testes locais (ex: http://localhost:5173/?slug=ibma)
        const urlParams = new URLSearchParams(window.location.search);
        const slugParam = urlParams.get('slug') || urlParams.get('church');
        if (slugParam) {
          setSubdomain(slugParam);
          const church = await churchesService.getBySlug(slugParam);
          if (church) {
            setTenant(church);
            if (church.name) document.title = church.name;
            if (church.logo_url) {
              const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
              if (favicon) favicon.href = church.logo_url;
              // Atualiza todas as logos na página
              document.querySelectorAll('img.church-logo, img[src*="logo-app"]').forEach((img) => {
                (img as HTMLImageElement).src = church.logo_url!;
              });
              // Dispara evento para o componente Logo.tsx
              window.dispatchEvent(new CustomEvent('churchLogoUpdated', { detail: church.logo_url }));
            }
          }
          setLoading(false);
          return;
        }

        // 1. Identificar se é o domínio principal ou localhost
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        const isMain = host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`;
        
        if (isMain || (isLocal && !host.includes('.'))) {
          setIsMainDomain(true);
          setLoading(false);
          return;
        }

        // 2. Extrair subdomínio (slug)
        let slug = '';
        if (host.endsWith(MAIN_DOMAIN)) {
          slug = host.replace(MAIN_DOMAIN, '').replace(/\.$/, '').split('.').pop() || '';
        } else {
          // Fallback para domínios customizados ou outros casos (ex: igreja.com.br)
          slug = host.split('.')[0];
        }

        if (!slug || slug === 'www') {
          setIsMainDomain(true);
          setLoading(false);
          return;
        }

        setSubdomain(slug);

        // 3. Buscar igreja no Supabase
        const church = await churchesService.getBySlug(slug);
        if (church) {
          setTenant(church);
          
          // Opcional: Atualizar o título da página e favicon se a igreja existir
          if (church.name) document.title = church.name;
          if (church.logo_url) {
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (favicon) favicon.href = church.logo_url;
            window.dispatchEvent(new CustomEvent('churchLogoUpdated', { detail: church.logo_url }));
          }
        } else {
          // Se o subdomínio não existe no banco, tratamos como domínio principal ou erro
          setIsMainDomain(true);
        }
      } catch (error) {
        console.error('Erro ao detectar tenant:', error);
        setIsMainDomain(true);
      } finally {
        setLoading(false);
      }
    }

    detectTenant();
  }, []);

  return { tenant, loading, isMainDomain, subdomain };
}
