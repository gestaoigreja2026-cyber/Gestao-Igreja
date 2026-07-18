import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up a new user successfully', async () => {
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'membro' as const,
      };

      const mockResponse = {
        data: {
          user: { id: '123', email: signUpData.email },
          session: { access_token: 'token' },
        },
        error: null,
      };

      (supabase.auth.signUp as any).mockResolvedValue(mockResponse);

      const result = await authService.signUp(signUpData);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            name: signUpData.name,
            role: signUpData.role,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on sign up failure', async () => {
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockError = new Error('Email already exists');
      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.signUp(signUpData)).rejects.toThrow(mockError);
    });

    it('should default role to membro if not provided', async () => {
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: '123' }, session: null },
        error: null,
      });

      await authService.signUp(signUpData);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              role: 'membro',
            }),
          }),
        })
      );
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const signInData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          user: { id: '123', email: signInData.email },
          session: { access_token: 'token' },
        },
        error: null,
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue(mockResponse);

      const result = await authService.signIn(signInData);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(signInData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on sign in failure', async () => {
      const signInData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockError = new Error('Invalid credentials');
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(authService.signIn(signInData)).rejects.toThrow(mockError);
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error on sign out failure', async () => {
      const mockError = new Error('Sign out failed');
      (supabase.auth.signOut as any).mockResolvedValue({ error: mockError });

      await expect(authService.signOut()).rejects.toThrow(mockError);
    });
  });

  describe('getSession', () => {
    it('should get current session successfully', async () => {
      const mockSession = { access_token: 'token', user: { id: '123' } };
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.getSession();

      expect(result).toEqual(mockSession);
    });

    it('should throw error on get session failure', async () => {
      const mockError = new Error('Session error');
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      await expect(authService.getSession()).rejects.toThrow(mockError);
    });
  });

  describe('getUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getUser();

      expect(result).toEqual(mockUser);
    });

    it('should throw error on get user failure', async () => {
      const mockError = new Error('User error');
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      await expect(authService.getUser()).rejects.toThrow(mockError);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

      await authService.resetPassword(email);

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });

    it('should throw error on reset password failure', async () => {
      const email = 'test@example.com';
      const mockError = new Error('Reset failed');
      (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: mockError });

      await expect(authService.resetPassword(email)).rejects.toThrow(mockError);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'newpassword123';
      (supabase.auth.updateUser as any).mockResolvedValue({ error: null });

      await authService.updatePassword(newPassword);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword,
      });
    });

    it('should throw error on update password failure', async () => {
      const newPassword = 'newpassword123';
      const mockError = new Error('Update failed');
      (supabase.auth.updateUser as any).mockResolvedValue({ error: mockError });

      await expect(authService.updatePassword(newPassword)).rejects.toThrow(mockError);
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();
      (supabase.auth.onAuthStateChange as any).mockReturnValue(mockUnsubscribe);

      const result = authService.onAuthStateChange(callback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(result).toEqual(mockUnsubscribe);
    });
  });
});
