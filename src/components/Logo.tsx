import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { globalChurchLogo } from '@/hooks/useTenant';
import { useTenant } from '@/hooks/useTenant';

const DEFAULT_LOGO = '/logo-app.png';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  /** URL alternativa (ex: passada diretamente pela página de login) */
  overrideSrc?: string;
}

// Tamanhos da logo (+30% em relação ao original)
const sizeStyles: Record<string, { width: string; height: string }> = {
  xs: { width: '2.6rem',  height: '2.6rem' },
  sm: { width: '9.11rem', height: '9.11rem' },
  md: { width: '15.95rem', height: '15.95rem' },
  lg: { width: '27.33rem', height: '27.33rem' },
  xl: { width: '43.28rem', height: '43.28rem' },
};

export function Logo({ size = 'md', showText = true, overrideSrc }: LogoProps) {
  const { tenant } = useTenant();

  const resolvedSrc =
    overrideSrc ||
    tenant?.logo_url ||
    globalChurchLogo ||
    DEFAULT_LOGO;

  const [logoSrc, setLogoSrc] = useState(resolvedSrc);

  // Sincroniza se o tenant mudar depois do render inicial
  useEffect(() => {
    const next =
      overrideSrc ||
      tenant?.logo_url ||
      globalChurchLogo ||
      DEFAULT_LOGO;
    setLogoSrc(next);
  }, [tenant?.logo_url, overrideSrc]);

  // Escuta eventos externos (ex: script inline do index.html terminar)
  useEffect(() => {
    const handler = (e: Event) => {
      if (!overrideSrc && !tenant?.logo_url) {
        setLogoSrc((e as CustomEvent).detail || DEFAULT_LOGO);
      }
    };
    window.addEventListener('churchLogoUpdated', handler);
    return () => window.removeEventListener('churchLogoUpdated', handler);
  }, [overrideSrc, tenant?.logo_url]);

  return (
    <div className={cn(
      'flex items-center',
      size === 'lg' ? 'flex-col text-center gap-4' : 'flex-row gap-3',
    )}>
      <div
        className="flex items-center justify-center rounded-xl transition-all duration-500 z-10 overflow-hidden"
        style={{ ...sizeStyles[size] }}
      >
        <img
          src={logoSrc}
          alt={tenant?.name || 'Gestão Igreja'}
          className="church-logo w-full h-full object-contain"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          onError={() => setLogoSrc(DEFAULT_LOGO)}
        />
      </div>
    </div>
  );
}
