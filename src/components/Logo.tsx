import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { globalChurchLogo } from '@/hooks/useTenant';
import { useTenant } from '@/hooks/useTenant';

const DEFAULT_LOGO = '/logo-app.png?v=211';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  /** URL alternativa (ex: passada diretamente pela página de login) */
  overrideSrc?: string;
  /** Permite mostrar o controle de upload dentro da área da logo */
  editable?: boolean;
  onFile?: (file: File) => void;
}

// Tamanhos da logo (+30% em relação ao original)
const sizeStyles: Record<string, { width: string; height: string }> = {
  xs: { width: '2.4rem',  height: '2.4rem' },
  sm: { width: '5.5rem',  height: '5.5rem' },
  md: { width: '9.6rem',  height: '9.6rem' },
  lg: { width: '24rem',   height: '24rem' },
  xl: { width: '38rem',   height: '38rem' },
};

export function Logo({ size = 'md', showText = true, overrideSrc, editable = false, onFile }: LogoProps) {
  const { tenant } = useTenant();

  const resolvedSrc = overrideSrc ?? tenant?.logo_url ?? globalChurchLogo ?? DEFAULT_LOGO;

  const [logoSrc, setLogoSrc] = useState(resolvedSrc);

  // Sincroniza se o tenant/override mudar depois do render inicial
  useEffect(() => {
    setLogoSrc(resolvedSrc);
  }, [resolvedSrc]);

  // Escuta eventos externos (ex: script inline do index.html terminar)
  useEffect(() => {
    const handler = (e: Event) => {
      setLogoSrc(resolvedSrc);
    };
    window.addEventListener('churchLogoUpdated', handler);
    return () => window.removeEventListener('churchLogoUpdated', handler);
  }, [resolvedSrc]);

  return (
    <div className={cn(
      'flex items-center',
      size === 'lg' ? 'flex-col text-center gap-4' : 'flex-row gap-3',
    )}>
      <div
        className="relative flex items-center justify-center rounded-xl transition-all duration-500 z-10 p-1 bg-white overflow-hidden"
        style={{ ...sizeStyles[size] }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={tenant?.name || 'Gestão Igreja'}
            className="church-logo w-full h-full object-contain object-center"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            onError={() => setLogoSrc(DEFAULT_LOGO)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* empty placeholder */}
          </div>
        )}

        {editable && (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-transparent">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (onFile) onFile(file);
              }}
            />
            <div className="flex flex-col items-center gap-2 bg-white/90 rounded-xl p-3 shadow-md">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 8l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-semibold text-primary">Alterar logo</span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
