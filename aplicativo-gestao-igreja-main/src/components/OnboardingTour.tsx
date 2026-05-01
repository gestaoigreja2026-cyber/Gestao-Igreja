import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'gestao_igreja_onboarding_v1';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  action?: () => void;
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Gestão Igreja!',
    description: 'Este guia rápido vai mostrar os principais recursos do sistema. Você pode pular a qualquer momento.',
  },
  {
    id: 'sidebar',
    title: 'Menu lateral',
    description: 'Acesse todas as áreas pelo menu à esquerda: membros, células, eventos, financeiro e muito mais. No celular, toque no ícone ☰ para abrir.',
    target: '[data-onboarding-sidebar]',
  },
  {
    id: 'dashboard',
    title: 'Dashboard personalizável',
    description: 'Aqui você vê o versículo do dia, aniversariantes e ações rápidas. Use o botão "Personalizar" para escolher o que exibir.',
    target: '[data-dashboard-root]',
  },
  {
    id: 'themes',
    title: 'Temas',
    description: 'Escolha cores e temas que combinam com sua igreja. Toque no ícone de paleta no canto superior.',
    target: '[data-onboarding-themes]',
  },
  {
    id: 'end',
    title: 'Pronto para começar!',
    description: 'Explore o sistema e, em caso de dúvidas, acesse "Como Acessar" no Dashboard para ver o guia completo.',
    action: () => {},
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (done === 'true') return;

      // Só mostra após login, no dashboard
      const timer = setTimeout(() => {
        const path = window.location.pathname;
        if (path === '/dashboard' || path === '/') {
          setVisible(true);
        }
      }, 800);

      return () => clearTimeout(timer);
    } catch {
      setVisible(false);
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const next = () => {
    const s = STEPS[step];
    if (s?.action) s.action();
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay escuro */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={finish}
        aria-hidden
      />

      {/* Card do tour */}
      <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{current.description}</p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="shrink-0 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-6">
          <span className="text-xs text-muted-foreground">
            {step + 1} de {STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              Pular
            </Button>
            <Button size="sm" onClick={next} className="gap-1">
              {step >= STEPS.length - 1 ? 'Concluir' : 'Próximo'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
