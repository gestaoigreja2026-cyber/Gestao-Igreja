import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

/**
 * Hook para gerenciar permissões de visualização e edição
 * Baseado nas regras de negócio do sistema
 */
export function usePermissions() {
  const { user } = useAuth();

  // Roles que podem editar/excluir conteúdo (acesso total)
  const editingRoles: UserRole[] = ['superadmin', 'admin', 'pastor', 'pastor_admin', 'secretario'];

  // Roles que podem editar apenas conteúdo específico
  const specificEditRoles: UserRole[] = ['lider_celula', 'lider_ministerio', 'tesoureiro', 'diretor_patrimonio'];

  // Roles que podem apenas visualizar (com exceções específicas)
  const viewOnlyRoles: UserRole[] = ['membro', 'aluno', 'congregado'];

  const canEdit = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditSpecific = useMemo(() => {
    if (!user) return false;
    return specificEditRoles.includes(user.role);
  }, [user]);

  const isViewOnly = useMemo(() => {
    if (!user) return false;
    return viewOnlyRoles.includes(user.role);
  }, [user]);

  // Permissões específicas por funcionalidade
  const canEditPrayerRequests = useMemo(() => {
    if (!user) return false;
    // Todos podem postar pedidos de oração
    return true;
  }, [user]);

  const canDeletePrayerRequests = useMemo(() => {
    if (!user) return false;
    // Apenas admin, pastor, secretary podem excluir pedidos
    return ['superadmin', 'admin', 'pastor', 'pastor_admin', 'secretario'].includes(user.role);
  }, [user]);

  const canEditReadingPlans = useMemo(() => {
    if (!user) return false;
    // Todos podem criar seus planos de leitura
    return true;
  }, [user]);

  const canDeleteReadingPlans = useMemo(() => {
    if (!user) return false;
    // Apenas admin, pastor, secretary podem excluir planos de outros
    return ['superadmin', 'admin', 'pastor', 'pastor_admin', 'secretario'].includes(user.role);
  }, [user]);

  const canEditCells = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role) || specificEditRoles.includes(user.role);
  }, [user]);

  const canEditMinistries = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role) || user.role === 'lider_ministerio';
  }, [user]);

  const canEditSchools = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditDiscipleship = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditInstitutional = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditSocialMedia = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditBroadcasts = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditPrivacy = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditPixDonations = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role) || user.role === 'tesoureiro';
  }, [user]);

  const canEditEvents = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditUploads = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditPastors = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditAssets = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role) || user.role === 'diretor_patrimonio' || user.role === 'tesoureiro';
  }, [user]);

  const canEditSecretariat = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role);
  }, [user]);

  const canEditReports = useMemo(() => {
    if (!user) return false;
    return editingRoles.includes(user.role) || user.role === 'lider_ministerio';
  }, [user]);

  return {
    canEdit,
    canEditSpecific,
    isViewOnly,
    canEditPrayerRequests,
    canDeletePrayerRequests,
    canEditReadingPlans,
    canDeleteReadingPlans,
    canEditCells,
    canEditMinistries,
    canEditSchools,
    canEditDiscipleship,
    canEditInstitutional,
    canEditSocialMedia,
    canEditBroadcasts,
    canEditPrivacy,
    canEditPixDonations,
    canEditEvents,
    canEditUploads,
    canEditPastors,
    canEditAssets,
    canEditSecretariat,
    canEditReports,
  };
}
