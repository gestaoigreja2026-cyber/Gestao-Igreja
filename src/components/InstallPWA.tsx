import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [logoSrc, setLogoSrc] = useState(globalChurchLogo || "/novo-icone-app.png");

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
      if (!isIOS) setShowBanner(true);
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

  const hiddenPaths = ['/', '/login', '/checkout', '/cadastro-igreja-trial'];
  if (hiddenPaths.includes(location.pathname)) return null;

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[380px] md:bottom-6 z-50 rounded-2xl shadow-2xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 animate-in slide-in-from-bottom-4 overflow-hidden">
        {/* Header com logo e fechar */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <img
            src={churchLogo}
            alt={`Logo ${churchName}`}
            className="h-14 w-14 shrink-0 object-contain rounded-xl border border-gray-100 dark:border-zinc-700 bg-white p-1"
            onError={(e) => { (e.target as HTMLImageElement).src = "/novo-icone-app.png"; }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-black dark:text-white text-base leading-tight truncate">
              Instalar {churchName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Use como app no celular ou PC
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Botão de instalar */}
        <div className="px-4 pb-4">
          <Button
            onClick={handleInstall}
            className="w-full gap-2 h-10 font-semibold rounded-xl"
          >
            <Download className="h-4 w-4" />
            Instalar aplicativo
          </Button>
        </div>
      </div>
    </>
  );
}
