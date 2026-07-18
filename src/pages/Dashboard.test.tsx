import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '123', name: 'João Silva', role: 'pastor' },
    isAuthenticated: true,
    authLoading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({ tenant: { name: 'Igreja Teste' }, loading: false, isMainDomain: false }),
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
  useDocumentTitle: () => {},
}));

vi.mock('@/lib/dashboardConfig', () => ({
  getDashboardConfig: () => ({
    widgetOrder: ['verse', 'birthdays', 'quick_actions'],
    visibleWidgets: ['verse', 'birthdays', 'quick_actions'],
  }),
  saveDashboardConfig: vi.fn(),
}));

vi.mock('@/lib/subscriptionConfig', () => ({
  SUBSCRIPTION_PIX: {
    pixKey: 'test-pix-key',
    holderName: 'Test Holder',
    bank: 'Test Bank',
    receiptEmail: 'test@example.com',
    promoPrice: '97,00',
    fullPrice: '147,00',
  },
}));

vi.mock('@/components/DailyVerse', () => ({
  DailyVerse: () => <div data-testid="daily-verse">Daily Verse</div>,
}));

vi.mock('@/components/BirthdayCard', () => ({
  BirthdayCard: () => <div data-testid="birthday-card">Birthday Card</div>,
}));

vi.mock('@/components/DashboardCustomizer', () => ({
  DashboardCustomizer: ({ onConfigChange }: any) => (
    <button onClick={() => onConfigChange({ widgetOrder: [], visibleWidgets: [] })}>
      Customize
    </button>
  ),
}));

vi.mock('@/components/dashboard/StatsOverview', () => ({
  StatsOverview: () => <div data-testid="stats-overview">Stats Overview</div>,
}));

vi.mock('@/components/dashboard/UpcomingEvents', () => ({
  UpcomingEvents: () => <div data-testid="upcoming-events">Upcoming Events</div>,
}));

vi.mock('@/components/dashboard/RecentConverts', () => ({
  RecentConverts: () => <div data-testid="recent-converts">Recent Converts</div>,
}));

vi.mock('@/components/dashboard/FinanceSummary', () => ({
  FinanceSummary: () => <div data-testid="finance-summary">Finance Summary</div>,
}));

vi.mock('@/components/dashboard/GrowthChart', () => ({
  GrowthChart: () => <div data-testid="growth-chart">Growth Chart</div>,
}));

vi.mock('@/components/SystemStatusBanner', () => ({
  SystemStatusBanner: () => <div data-testid="system-status">System Status</div>,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with user greeting', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Olá, João/i)).toBeVisible();
    expect(screen.getByText('Bem-vindo ao painel de gestão')).toBeVisible();
  });

  it('should render dashboard widgets', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId('daily-verse')).toBeVisible();
    expect(screen.getByTestId('birthday-card')).toBeVisible();
    expect(screen.getByTestId('stats-overview')).toBeVisible();
    expect(screen.getByTestId('growth-chart')).toBeVisible();
    expect(screen.getByTestId('upcoming-events')).toBeVisible();
    expect(screen.getByTestId('recent-converts')).toBeVisible();
    expect(screen.getByTestId('finance-summary')).toBeVisible();
  });

  it('should render quick actions for pastor role', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Ministérios')).toBeVisible();
    expect(screen.getByText('Células')).toBeVisible();
    expect(screen.getByText('Secretaria')).toBeVisible();
    expect(screen.getByText('Relatórios')).toBeVisible();
  });

  it('should render customize button', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Customize')).toBeVisible();
  });

  it('should render system status banner', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId('system-status')).toBeVisible();
  });
});
