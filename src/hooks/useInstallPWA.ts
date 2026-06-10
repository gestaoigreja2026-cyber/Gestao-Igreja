import { useState, useEffect, useCallback } from 'react';

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      if ((window.navigator as any)?.standalone) {
        setIsInstalled(true);
      }
    };

    const promptHandler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      (window as any).deferredPrompt = promptEvent;
    };

    const installedHandler = () => setIsInstalled(true);

    checkInstalled();
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', promptHandler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt || (window as any).deferredPrompt;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        return true;
      }
    } catch (err) {
      console.error('Erro ao executar prompt PWA:', err);
    }

    return false;
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    install,
    isInstalled,
  };
}
