import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { globalChurchLogo } from './../hooks/useTenant';

const LOGO_SRC = '/logo-app.png';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

// Tamanhos da logo (+30% em relação ao original)
const sizeStyles: Record<string, { width: string; height: string }> = {
  xs: { width: '2.6rem', height: '2.6rem' },
  sm: { width: '9.11rem', height: '9.11rem' },
  md: { width: '15.95rem', height: '15.95rem' },
  lg: { width: '27.33rem', height: '27.33rem' },
  xl: { width: '43.28rem', height: '43.28rem' },
};

export function Logo({ size = 'md', showText = true }: LogoProps) {
  // Estado para armazenar a logo dinâmica
  const [logoSrc, setLogoSrc] = useState(globalChurchLogo || LOGO_SRC);

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      if (e.detail) {
        setLogoSrc(e.detail);
      }
    };
    
    // Escuta evento customizado disparado pelo useTenant
    window.addEventListener('churchLogoUpdated', handleLogoUpdate);

    // Tenta pegar a logo que o script do index.html salvou ou buscar no manifest
    const updateLogo = () => {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon && favicon.getAttribute('href') && !favicon.getAttribute('href')?.includes('logo-app.png')) {
        setLogoSrc(favicon.getAttribute('href') || LOGO_SRC);
      }
    };
    
    updateLogo();
    // Pequeno delay para garantir que o script do index.html já rodou
    const timer = setTimeout(updateLogo, 1000);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('churchLogoUpdated', handleLogoUpdate);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center",
      size === 'lg' ? "flex-col text-center gap-4" : "flex-row gap-3"
    )}>
      <div
        className="flex items-center justify-center rounded-xl transition-all duration-500 z-10 overflow-hidden"
        style={{ ...sizeStyles[size] }}
      >
        <img
          src={logoSrc}
          alt="Gestão Igreja"
          className="church-logo w-full h-full object-contain"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    </div>
  );
}
