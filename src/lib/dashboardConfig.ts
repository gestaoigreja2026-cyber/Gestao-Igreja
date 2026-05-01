import type { UserRole } from '@/types';

export type DashboardWidgetId = 'verse' | 'birthdays' | 'quick_actions';

export interface DashboardConfig {
  visibleWidgets: DashboardWidgetId[];
  widgetOrder: DashboardWidgetId[];
}

const DEFAULT_WIDGETS: DashboardWidgetId[] = ['verse', 'birthdays', 'quick_actions'];

const ROLE_DEFAULT_WIDGETS: Partial<Record<UserRole, DashboardWidgetId[]>> = {
  pastor: ['verse', 'birthdays', 'quick_actions'],
  admin: ['verse', 'birthdays', 'quick_actions'],
  secretario: ['verse', 'birthdays', 'quick_actions'],
  tesoureiro: ['verse', 'birthdays', 'quick_actions'],
  diretor_patrimonio: ['verse', 'birthdays', 'quick_actions'],
  superadmin: ['verse', 'birthdays', 'quick_actions'],
};

const STORAGE_KEY = 'dashboard_config';

export function getDashboardConfig(userId: string | undefined, role: UserRole | undefined): DashboardConfig {
  if (!userId) {
    const roleWidgets = role ? ROLE_DEFAULT_WIDGETS[role] ?? DEFAULT_WIDGETS : DEFAULT_WIDGETS;
    return { visibleWidgets: roleWidgets, widgetOrder: roleWidgets };
  }
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardConfig;
      if (parsed.visibleWidgets?.length && parsed.widgetOrder?.length) {
        return parsed;
      }
    }
  } catch {
    /* fallback */
  }
  const roleWidgets = role ? ROLE_DEFAULT_WIDGETS[role] ?? DEFAULT_WIDGETS : DEFAULT_WIDGETS;
  return { visibleWidgets: roleWidgets, widgetOrder: roleWidgets };
}

export function saveDashboardConfig(userId: string, config: DashboardConfig): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}
