import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { globalChurchLogo } from '@/hooks/useTenant';
import { useTenant } from '@/hooks/useTenant';

const DEFAULT_LOGO = '/logo-app.png?v=212';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  /** URL alternativa (ex: passada diretamente pela página de login) */
  overrideSrc?: string;
  /** Permite mostrar o controle de upload dentro da área da logo */
  editable?: boolean;
  onFile?: (file: File) => void;
  className?: string;
  /** Se true, preserva as cores originais sem converter para branco no modo escuro */
  keepColors?: boolean;
}

// Analisa se a imagem tem tons predominantemente escuros para adaptar nos temas escuros
function checkIsDarkLogo(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let totalLum = 0;
    let nonTransparent = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 35) {
        // Luminosidade relativa
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLum += lum;
        nonTransparent++;
      }
    }
    if (nonTransparent === 0) return true;
    const avgLum = totalLum / nonTransparent;
    // Se a luminosidade for menor que 160 (tons escuros/médios), precisa ficar branca no escuro
    return avgLum < 160;
  } catch {
    // Fallback de segurança (CORS etc.): assume escura para garantir leitura no tema escuro
    return true;
  }
}

// Tamanhos da logo reduzidos em 15% proporcionalmente
const sizeStyles: Record<string, { width: string; height: string }> = {
  xs: { width: '2.04rem',  height: '2.04rem' },
  sm: { width: '4.675rem',  height: '4.675rem' },
  md: { width: '8.16rem',  height: '8.16rem' },
  lg: { width: '20.4rem',   height: '20.4rem' },
  xl: { width: '32.3rem',   height: '32.3rem' },
};

export function Logo({ size = 'md', showText = true, overrideSrc, editable = false, onFile, className, keepColors = false }: LogoProps) {
  const { tenant } = useTenant();

  const resolvedSrc = overrideSrc ?? tenant?.logo_url ?? globalChurchLogo ?? DEFAULT_LOGO;

  const [logoSrc, setLogoSrc] = useState(resolvedSrc);
  const [isDarkLogo, setIsDarkLogo] = useState(true);

  // Sincroniza se o tenant/override mudar depois do render inicial
  useEffect(() => {
    setLogoSrc(resolvedSrc);
    setIsDarkLogo(true);
  }, [resolvedSrc]);

  // Escuta eventos externos (ex: script inline do index.html terminar)
  useEffect(() => {
    const handler = (e: Event) => {
      setLogoSrc(resolvedSrc);
      setIsDarkLogo(true);
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
        className={cn(
          "relative flex items-center justify-center transition-all duration-300 z-10 max-w-full bg-transparent",
          className
        )}
        style={{ ...sizeStyles[size] }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            crossOrigin="anonymous"
            alt={tenant?.name || 'Gestão Igreja'}
            className={cn(
              "church-logo w-full h-full object-contain object-center select-none transition-all duration-300",
              !keepColors && isDarkLogo && "dark:brightness-0 dark:invert dark:opacity-95"
            )}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            onLoad={(e) => {
              const isDark = checkIsDarkLogo(e.currentTarget);
              setIsDarkLogo(isDark);
            }}
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
