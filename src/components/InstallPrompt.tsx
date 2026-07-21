import { useState, useEffect, useRef } from 'react';
import { X, Download, Smartphone, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Shared hook ──────────────────────────────────────────────────────────────
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
      if ((window.navigator as any)?.standalone === true) setIsInstalled(true);
    };
    checkInstalled();

    // Capturar evento imediatamente se já existir no window (capturado no index.html)
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Polling: tenta capturar o evento por até 10s caso ele dispare depois do mount
    const poll = setInterval(() => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        clearInterval(poll);
      }
    }, 500);
    const pollTimeout = setTimeout(() => clearInterval(poll), 10000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(poll);
      clearTimeout(pollTimeout);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      alert('Instalação não está pronta ou já foi concluída.');
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    } catch (error: any) {
      console.error('Erro ao instalar:', error);
      alert('Não foi possível abrir o instalador nativo. Motivo: ' + error?.message + '\n\nTente instalar clicando no ícone no lado direito da barra de endereços do navegador.');
    }
  };

  return { canInstall: !!deferredPrompt && !isInstalled, isInstalled, install };
}

// ── Banner fixo no rodapé (usado no App.tsx) ─────────────────────────────────
export function InstallPrompt() {
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50 animate-in slide-in-from-bottom">
      <div className="max-w-md mx-auto flex items-center gap-4">
        <img src="/pwa-icon-192.png" alt="Gestão Igreja" className="w-14 h-14 rounded-xl shadow" />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Instalar Gestão Igreja</h3>
          <p className="text-xs text-gray-500">Acesso rápido na tela inicial do seu celular</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={install}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition text-sm"
          >
            <Download className="w-4 h-4" />
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Botão Hero para a Landing Page — SEMPRE VISÍVEL ──────────────────────────
export function InstallHeroButton() {
  const { canInstall, isInstalled, install } = usePwaInstall();

  if (isInstalled) {
    return (
      <div className="flex items-center gap-3 h-16 px-6 rounded-2xl border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-bold text-sm shadow-md">
        <img src="/pwa-icon-192.png" alt="" className="w-9 h-9 rounded-xl shadow" />
        <span className="text-left leading-tight">
          <span className="block text-xs text-emerald-500 uppercase tracking-wider font-bold">Instalado ✓</span>
          <span className="font-black text-emerald-800">Gestão Igreja</span>
        </span>
      </div>
    );
  }

  // Sempre mostra o botão — se canInstall estiver pronto, abre o prompt nativo
  return (
    <button
      onClick={canInstall ? install : undefined}
      title={canInstall ? 'Instalar app na tela inicial' : 'Abra no celular para instalar'}
      className={`flex items-center gap-3 h-16 px-6 rounded-2xl border-2 font-bold text-sm shadow-lg transition-all group
        ${canInstall
          ? 'border-[#0EA5E9] bg-sky-50 hover:bg-sky-100 hover:shadow-sky-200 cursor-pointer hover:scale-105'
          : 'border-[#0EA5E9]/40 bg-sky-50/60 cursor-default'
        }`}
    >
      <div className="relative">
        <img src="/pwa-icon-192.png" alt="Gestão Igreja App" className="w-10 h-10 rounded-xl shadow-md" />
        {canInstall && (
          <span className="absolute -bottom-1 -right-1 bg-[#0EA5E9] rounded-full p-0.5">
            <Download className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
      <span className="text-left leading-tight">
        <span className="block text-[10px] text-[#0EA5E9] uppercase tracking-wider font-black">
          {canInstall ? '⬇ Instalar App' : '📲 Disponível como App'}
        </span>
        <span className="font-black text-slate-800 text-sm">Gestão Igreja</span>
        <span className="block text-[10px] text-slate-400 font-normal">
          {canInstall ? 'Adicionar à tela inicial' : 'Abra no celular para instalar'}
        </span>
      </span>
    </button>
  );
}
