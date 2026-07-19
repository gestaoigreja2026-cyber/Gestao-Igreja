import { forwardRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewLogin from '../pages/NewLogin';

const loginMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({ tenant: { name: 'Igreja Teste' } }),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/lib/supabaseClient', () => ({
  testSupabaseConnection: vi.fn().mockResolvedValue({
    ok: true,
    urlConfigured: true,
    keyConfigured: true,
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: forwardRef((props: any, ref: any) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/Logo', () => ({
  Logo: () => <div>Logo</div>,
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
  useDocumentTitle: () => {},
}));


beforeEach(() => {
  loginMock.mockReset();
  loginMock.mockResolvedValue(true);
});

describe('NewLogin', () => {
  it('deve enviar o role membro ao entrar', async () => {
    render(<NewLogin />);

    fireEvent.change(screen.getByPlaceholderText('Seu Nome'), {
      target: { value: 'João' },
    });

    fireEvent.change(screen.getByPlaceholderText('E-mail'), {
      target: { value: 'joao@email.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));

    fireEvent.click(screen.getByRole('button', { name: /membro/i }));

    const pinInputs = document.querySelectorAll('input[type="tel"]');
    pinInputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(index + 1) } });
    });

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(loginMock).toHaveBeenCalledWith(
      'joao@email.com',
      '123456',
      'membro',
      'João'
    );
  });
});