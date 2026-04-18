import React, { useState } from 'react';
import { Menu, ArrowLeft, Info, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_PIX } from '@/lib/subscriptionConfig';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import { OnboardingTour } from './OnboardingTour';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Logo } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { GlobalSearch } from './GlobalSearch';


interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { user, viewingChurch, exitChurchView } = useAuth();
    const { toast } = useToast();
    const showRootBanner = user?.role === 'superadmin' && viewingChurch;
    const showSubscriptionNotice = ['pastor', 'secretario', 'tesoureiro'].includes(user?.role ?? '');
    const copyPixKey = () => {
        navigator.clipboard?.writeText('(91) 99383-7093');
        toast({ title: 'Chave PIX copiada!', duration: 2000 });
    };

    return (
        <div className="flex min-h-screen bg-background" translate="no">
            {/* Sidebar fixa - visível a partir de 768px (tablet/PC), mesma experiência que no PC */}
            <div className="hidden md:flex print:hidden border-r border-border bg-card" data-onboarding-sidebar>
                <Sidebar />
            </div>

            {/* Celular (<768px): header + conteúdo; ao toque no menu abre Sheet com Sidebar */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden flex items-center justify-between py-3 px-4 sm:py-4 border-b border-border bg-card print:hidden shadow-sm relative z-50 safe-area-padding">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Logo size="xs" showText={false} />
                        <span className="font-black text-primary text-[12.5px] sm:text-[14.5px] tracking-tight truncate">Gestão Igreja</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 relative z-50">
                        <GlobalSearch />
                        <NotificationCenter />
                        <div className="relative z-50 min-h-[48px] min-w-[48px] flex items-center justify-center" data-onboarding-themes>
                            <ThemeSwitcher collapsed={true} direction="down" />
                        </div>
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Abrir menu de navegação" className="h-14 w-14 min-h-[52px] min-w-[52px] md:h-12 md:w-12 shadow-sm border border-border/50 bg-background/50 rounded-xl active:scale-95 transition-transform">
                                    <Menu className="h-8 w-8 md:h-6 md:w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-[min(16rem,85vw)] max-w-[85vw] border-r-0 rounded-r-2xl sm:w-64">
                                <div className="h-full" onClick={() => setOpen(false)}>
                                    <Sidebar />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Barra superior desktop: busca + notificações */}
                <header className="hidden md:flex items-center justify-end gap-2 px-4 py-2 border-b border-border bg-card/50 print:hidden">
                    <GlobalSearch />
                    <NotificationCenter />
                </header>

                <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden safe-area-padding" tabIndex={-1}>
                    {showRootBanner && (
                        <div className="sticky top-0 z-40 print:hidden flex items-center justify-between gap-3 px-4 py-2 sm:px-6 bg-amber-100 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                            <span className="text-sm font-medium truncate">
                                Visualizando como <strong>{viewingChurch.name}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => { exitChurchView(); navigate('/superadmin'); }}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/50 hover:bg-amber-300/80 dark:hover:bg-amber-800/50 font-medium text-sm transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar ao Painel Root
                            </button>
                        </div>
                    )}
                    {showSubscriptionNotice && !showRootBanner && (
                        <div className="sticky top-0 z-40 print:hidden px-4 py-3 sm:px-6 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                <div className="text-sm space-y-1 min-w-0">
                                    <p className="font-medium">
                                        <strong>Assinatura:</strong> 7 dias grátis para testar. Mensalidades via PIX. 50 primeiras igrejas: R$ 75/mês. Demais: R$ 150/mês. Vencimento 30 dias + 5 de tolerância.
                                    </p>
                                    <p>
                                        <strong>PIX:</strong> <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">(91) 99383-7093</span> — Luiz Eduardo · Nubank.
                                        <button
                                            type="button"
                                            onClick={copyPixKey}
                                            className="ml-1.5 inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 hover:underline"
                                            title="Copiar chave PIX"
                                        >
                                            <Copy className="h-3.5 w-3.5" /> Copiar
                                        </button>
                                    </p>
                                    <p className="text-xs text-blue-700/90 dark:text-blue-300/90">1) Informe o nome da igreja no PIX antes de pagar. 2) Envie o comprovante para <a href={`mailto:${SUBSCRIPTION_PIX.receiptEmail}?subject=Comprovante%20PIX%20-%20Mensalidade`} className="underline font-medium">{SUBSCRIPTION_PIX.receiptEmail}</a></p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="container mx-auto p-4 sm:p-6 md:p-8 lg:p-8 max-w-7xl animate-in fade-in duration-500">
                        <PageBreadcrumbs />
                        {children}
                    </div>
                </main>
            </div>
            <OnboardingTour />
        </div>
    );
}
