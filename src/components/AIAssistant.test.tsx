import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AIAssistant } from './AIAssistant';
import * as AuthContextModule from '@/contexts/AuthContext';
import { membersService } from '@/services/members.service';
import { eventsService } from '@/services/events.service';
import { cellsService } from '@/services/cells.service';
import { ministriesService } from '@/services/ministries.service';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/members.service', () => ({
  membersService: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/events.service', () => ({
  eventsService: {
    getUpcoming: vi.fn(),
  },
}));

vi.mock('@/services/cells.service', () => ({
  cellsService: {
    getActive: vi.fn(),
  },
}));

vi.mock('@/services/ministries.service', () => ({
  ministriesService: {
    getActive: vi.fn(),
  },
}));

describe('AIAssistant - Testes Automáticos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  describe('Cenário 1: Usuário NÃO logado (Página Pública / Landing)', () => {
    beforeEach(() => {
      vi.mocked(AuthContextModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
        churchId: undefined,
        viewingChurch: null,
      } as any);
    });

    it('deve responder sobre funcionalidades do sistema (ex: caixa diário)', async () => {
      render(<AIAssistant />);
      
      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const input = screen.getByPlaceholderText('Digite sua dúvida...');
      fireEvent.change(input, { target: { value: 'como funciona o caixa' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/Caixa Diário/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('deve BLOQUEAR consulta de dados de membros e programação se não estiver logado', async () => {
      render(<AIAssistant />);

      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const input = screen.getByPlaceholderText('Digite sua dúvida...');
      fireEvent.change(input, { target: { value: 'Qual o telefone do pastor João?' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/Acesso Restrito ao App/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Cenário 2: Usuário LOGADO como Membro Comum (sem permissão de liderança)', () => {
    beforeEach(() => {
      vi.mocked(AuthContextModule.useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { id: 'u1', name: 'Lucas Membro', role: 'membro', churchId: 'church-1' },
        churchId: 'church-1',
        viewingChurch: null,
      } as any);
    });

    it('deve responder à programação da igreja consultando o banco em tempo real', async () => {
      vi.mocked(eventsService.getUpcoming).mockResolvedValue([
        {
          id: 'ev-1',
          church_id: 'church-1',
          title: 'Culto da Família',
          type: 'culto',
          date: '2026-11-01',
          time: '19:00:00',
          location: 'Templo Sede',
          description: null,
          responsible_id: null,
          status: 'confirmado',
          estimated_attendees: null,
          actual_attendees: null,
          registration_fee: null,
          created_at: '',
          updated_at: '',
        },
      ]);

      render(<AIAssistant />);
      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const progBtn = screen.getByRole('button', { name: /📅 Programação/i });
      fireEvent.click(progBtn);

      await waitFor(() => {
        expect(eventsService.getUpcoming).toHaveBeenCalledWith('church-1');
        expect(screen.getByText(/Culto da Família/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('deve avisar que telefone/endereço é restrito à liderança caso membro comum pergunte', async () => {
      render(<AIAssistant />);
      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const input = screen.getByPlaceholderText('Pergunte agenda, célula, contato...');
      fireEvent.change(input, { target: { value: 'Telefone do Gabriel' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/Permissão Restrita à Liderança/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Cenário 3: Usuário LOGADO como Pastor/Liderança (com permissão)', () => {
    beforeEach(() => {
      vi.mocked(AuthContextModule.useAuth).mockReturnValue({
        isAuthenticated: true,
        user: { id: 'p1', name: 'Pastor Roberto', role: 'pastor', churchId: 'church-1' },
        churchId: 'church-1',
        viewingChurch: null,
      } as any);
    });

    it('deve responder com o telefone e endereço do membro encontrado', async () => {
      vi.mocked(membersService.getAll).mockResolvedValue([
        {
          id: 'm1',
          church_id: 'church-1',
          name: 'Carlos Silva',
          phone: '(11) 98765-4321',
          address: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          email: 'carlos@teste.com',
          birth_date: '1990-05-10',
          marital_status: 'casado',
          gender: 'masculino',
          baptized: true,
          baptism_date: null,
          member_since: null,
          status: 'ativo',
          photo_url: null,
          notes: null,
          zip_code: null,
          created_at: '',
          updated_at: '',
        },
      ]);

      render(<AIAssistant />);
      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const input = screen.getByPlaceholderText('Pergunte agenda, célula, contato...');
      fireEvent.change(input, { target: { value: 'Qual o telefone e endereço do Carlos?' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(membersService.getAll).toHaveBeenCalledWith('church-1');
        expect(screen.getByText(/Carlos Silva/i)).toBeInTheDocument();
        expect(screen.getByText(/\(11\) 98765-4321/i)).toBeInTheDocument();
        expect(screen.getByText(/Rua das Flores, 123 - São Paulo - SP/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('deve responder às células ativas cadastradas', async () => {
      vi.mocked(cellsService.getActive).mockResolvedValue([
        {
          id: 'c1',
          name: 'Célula Betel',
          meeting_day: 'Quarta-feira',
          meeting_time: '20:00:00',
          address: 'Av Central, 500',
          leader: { name: 'Diácono Marcos' },
        },
      ]);

      render(<AIAssistant />);
      const openBtn = screen.getByTitle('Abrir Assistente Virtual');
      fireEvent.click(openBtn);

      const cellBtn = screen.getByRole('button', { name: /🏘️ Células/i });
      fireEvent.click(cellBtn);

      await waitFor(() => {
        expect(cellsService.getActive).toHaveBeenCalledWith('church-1');
        expect(screen.getByText(/Célula Betel/i)).toBeInTheDocument();
        expect(screen.getByText(/Diácono Marcos/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
