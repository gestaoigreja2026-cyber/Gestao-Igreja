import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { globalChurchLogo } from "@/hooks/useTenant";
import { useTenant } from "@/hooks/useTenant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS =
  typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any)?.standalone);

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [logoSrc, setLogoSrc] = useState(globalChurchLogo || "/logo-app.png");

  const { currentTheme } = useTheme();
  const { tenant } = useTenant();

  // Nome e logo dinâmicos via tenant context
  const churchName = tenant?.name || "Gestão Igreja";
  const churchLogo = tenant?.logo_url || logoSrc;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("pwa-dismissed")) return;
    if (isStandalone()) return;

    // 1. Verifica se o evento já foi capturado globalmente antes do React montar
    const globalPrompt = (window as any)
      .deferredPrompt as BeforeInstallPromptEvent | undefined;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
    }

    // 2. Escuta novos eventos (caso o React já esteja montado quando o evento disparar)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).deferredPrompt = e; // sincroniza globalmente
      if (!isIOS) setShowBanner(true); // Só mostra o banner quando estiver pronto no Android/Chrome
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 3. Para iOS, mostra o banner após um curto delay (já que não há evento)
    let timer: any;
    if (isIOS) {
      timer = setTimeout(() => setShowBanner(true), 1500);
    }

    // 4. Escutar atualizações dinâmicas da logo (ex: index.html inline script)
    const handleLogoUpdate = (e: Event) => {
      setLogoSrc((e as CustomEvent).detail || "/logo-app.png");
    };
    window.addEventListener("churchLogoUpdated", handleLogoUpdate);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("churchLogoUpdated", handleLogoUpdate);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    const prompt =
      deferredPrompt ||
      ((window as any).deferredPrompt as BeforeInstallPromptEvent | undefined);
    
    if (prompt) {
      setShowBanner(false);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
        }
      } catch (err) {
        console.error('Erro ao instalar PWA:', err);
      }
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-dismissed", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-md md:bottom-6 md:left-6 md:max-w-[420px] z-50 flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 rounded-2xl shadow-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 animate-in slide-in-from-bottom-4">
        <img
          src={churchLogo}
          alt={`Logo ${churchName}`}
          className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 shrink-0 object-contain rounded-lg p-1"
          onError={(e) => { (e.target as HTMLImageElement).src = "/logo-app.png"; }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-black dark:text-white text-sm sm:text-base md:text-lg leading-tight">
            Instalar {churchName}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Use como app no celular ou PC
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="gap-2 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
          >
            <Download className="h-4 w-4" />
            Instalar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
