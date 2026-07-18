import { describe, it, expect, vi, beforeEach } from 'vitest';
import { membersService } from './members.service';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient');

describe('membersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all members for a church', async () => {
      const churchId = 'church-123';
      const mockMembers = [
        { id: '1', name: 'Member 1', church_id: churchId },
        { id: '2', name: 'Member 2', church_id: churchId },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.getAll(churchId);

      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockQuery.eq).toHaveBeenCalledWith('church_id', churchId);
      expect(mockQuery.not).toHaveBeenCalledWith('church_id', 'is', null);
      expect(mockQuery.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockMembers);
    });

    it('should return empty array if no churchId provided', async () => {
      const result = await membersService.getAll(null);
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      const churchId = 'church-123';
      const mockError = new Error('Database error');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(membersService.getAll(churchId)).rejects.toThrow(mockError);
    });
  });

  describe('getActive', () => {
    it('should get active members only', async () => {
      const churchId = 'church-123';
      const mockMembers = [
        { id: '1', name: 'Active Member', status: 'ativo', church_id: churchId },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.getActive(churchId);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(result).toEqual(mockMembers);
    });
  });

  describe('getById', () => {
    it('should get a single member by ID', async () => {
      const memberId = 'member-123';
      const mockMember = { id: memberId, name: 'Test Member' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMember, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.getById(memberId);

      expect(mockQuery.eq).toHaveBeenCalledWith('id', memberId);
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    it('should throw error on failure', async () => {
      const memberId = 'member-123';
      const mockError = new Error('Member not found');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(membersService.getById(memberId)).rejects.toThrow(mockError);
    });
  });

  describe('create', () => {
    it('should create a new member', async () => {
      const churchId = 'church-123';
      const newMember = { name: 'New Member', email: 'new@example.com' };
      const createdMember = { id: '123', ...newMember, church_id: churchId };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdMember, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.create(newMember, churchId);

      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...newMember,
        church_id: churchId,
      });
      expect(result).toEqual(createdMember);
    });

    it('should throw error if churchId not provided', async () => {
      const newMember = { name: 'New Member' };

      await expect(membersService.create(newMember, '')).rejects.toThrow(
        'churchId é obrigatório para criar um membro'
      );
    });
  });

  describe('update', () => {
    it('should update a member', async () => {
      const memberId = 'member-123';
      const updates = { name: 'Updated Name' };
      const updatedMember = { id: memberId, ...updates };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedMember, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.update(memberId, updates);

      expect(mockQuery.update).toHaveBeenCalledWith(updates);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', memberId);
      expect(result).toEqual(updatedMember);
    });
  });

  describe('delete', () => {
    it('should delete a member', async () => {
      const memberId = 'member-123';

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await membersService.delete(memberId);

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', memberId);
    });

    it('should throw error on delete failure', async () => {
      const memberId = 'member-123';
      const mockError = new Error('Delete failed');

      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(membersService.delete(memberId)).rejects.toThrow(mockError);
    });
  });

  describe('search', () => {
    it('should search members by name or email', async () => {
      const churchId = 'church-123';
      const query = 'john';
      const mockMembers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', church_id: churchId },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.search(query, churchId);

      expect(mockQuery.or).toHaveBeenCalledWith(
        `name.ilike.%${query}%,email.ilike.%${query}%`
      );
      expect(result).toEqual(mockMembers);
    });

    it('should return empty array if no churchId provided', async () => {
      const result = await membersService.search('test', null);
      expect(result).toEqual([]);
    });
  });

  describe('getBirthdaysThisMonth', () => {
    it('should get members with birthdays in current month', async () => {
      const churchId = 'church-123';
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      
      // Criar data de aniversário no mês atual
      const birthdayDate = new Date(now.getFullYear(), currentMonth - 1, 15);
      const birthDateStr = birthdayDate.toISOString().split('T')[0];
      
      const mockMembers = [
        {
          id: '1',
          name: 'Birthday Member',
          birth_date: birthDateStr,
          status: 'ativo',
          church_id: churchId,
        },
        {
          id: '2',
          name: 'Other Member',
          birth_date: '2000-12-15',
          status: 'ativo',
          church_id: churchId,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.getBirthdaysThisMonth(churchId);

      // Verifica que a função foi chamada corretamente e retorna dados
      expect(supabase.from).toHaveBeenCalledWith('members');
      expect(mockQuery.eq).toHaveBeenCalledWith('church_id', churchId);
      expect(mockQuery.not).toHaveBeenCalledWith('church_id', 'is', null);
      expect(mockQuery.not).toHaveBeenCalledWith('birth_date', 'is', null);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'ativo');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if no churchId provided', async () => {
      const result = await membersService.getBirthdaysThisMonth(null);
      expect(result).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should get member statistics', async () => {
      const mockStats = { total: 100, active: 80, inactive: 20 };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await membersService.getStatistics();

      expect(supabase.from).toHaveBeenCalledWith('member_statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload member photo', async () => {
      const memberId = 'member-123';
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const publicUrl = 'https://example.com/photo.jpg';

      const mockStorage = {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { photo_url: publicUrl }, error: null }),
      };

      (supabase.storage as any) = mockStorage;
      (supabase.from as any).mockReturnValue(mockUpdateQuery);

      const result = await membersService.uploadPhoto(memberId, file);

      expect(mockStorage.from).toHaveBeenCalledWith('photos');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ photo_url: publicUrl });
      expect(result).toEqual(publicUrl);
    });
  });

  describe('addToMinistry', () => {
    it('should add member to ministry', async () => {
      const memberId = 'member-123';
      const ministryId = 'ministry-123';

      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await membersService.addToMinistry(memberId, ministryId);

      expect(supabase.from).toHaveBeenCalledWith('ministry_members');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          member_id: memberId,
          ministry_id: ministryId,
        },
        {
          onConflict: 'member_id,ministry_id',
        }
      );
    });

    it('should throw error on failure', async () => {
      const memberId = 'member-123';
      const ministryId = 'ministry-123';
      const mockError = new Error('Add to ministry failed');

      const mockQuery = {
        upsert: vi.fn().mockResolvedValue({ error: mockError }),
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(membersService.addToMinistry(memberId, ministryId)).rejects.toThrow(
        mockError
      );
    });
  });
});
