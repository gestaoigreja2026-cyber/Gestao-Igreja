import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getDashboardConfig,
  saveDashboardConfig,
  type DashboardConfig,
  type DashboardWidgetId,
} from '@/lib/dashboardConfig';

const ONBOARDING_KEY = 'gestao_igreja_onboarding_v1';

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  verse: 'Versículo do dia',
  birthdays: 'Aniversariantes',
  quick_actions: 'Ações rápidas',
};

interface DashboardCustomizerProps {
  userId: string | undefined;
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
}

export function DashboardCustomizer({ userId, config, onConfigChange }: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config, open]);

  const toggleWidget = (id: DashboardWidgetId, checked: boolean) => {
    setDraft((prev) => {
      const nextVisible = checked
        ? [...prev.visibleWidgets, id].filter((w, i, arr) => arr.indexOf(w) === i)
        : prev.visibleWidgets.filter((w) => w !== id);
      const safeVisible = nextVisible.length > 0 ? nextVisible : ['quick_actions'];
      const nextOrder = prev.widgetOrder.filter((w) => safeVisible.includes(w));
      (['verse', 'birthdays', 'quick_actions'] as const).forEach((w) => {
        if (safeVisible.includes(w) && !nextOrder.includes(w)) nextOrder.push(w);
      });
      return { visibleWidgets: safeVisible, widgetOrder: nextOrder };
    });
  };

  const handleSave = () => {
    onConfigChange(draft);
    if (userId) saveDashboardConfig(userId, draft);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
        title="Personalizar dashboard"
      >
        <Settings2 className="h-4 w-4" />
        Personalizar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar Dashboard</DialogTitle>
            <DialogDescription>
              Escolha quais blocos exibir no seu painel. As alterações são salvas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(['verse', 'birthdays', 'quick_actions'] as const).map((id) => (
              <div key={id} className="flex items-center gap-3">
                <Checkbox
                  id={id}
                  checked={draft.visibleWidgets.includes(id)}
                  onCheckedChange={(c) => toggleWidget(id, c === true)}
                />
                <label htmlFor={id} className="text-sm font-medium cursor-pointer">
                  {WIDGET_LABELS[id]}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline self-start sm:mr-auto"
              onClick={() => {
                try {
                  localStorage.removeItem(ONBOARDING_KEY);
                  window.location.reload();
                } catch {
                  /* ignore */
                }
              }}
            >
              Ver tour de boas-vindas novamente
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
