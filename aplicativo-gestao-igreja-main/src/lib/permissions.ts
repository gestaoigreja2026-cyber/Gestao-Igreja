import type { UserRole } from '@/types';

/**
 * Roles que em determinados módulos só podem VER (sem editar, excluir, criar, imprimir, baixar).
 * Módulos: Células, Ministérios, Secretaria, Escolas, Relatórios, Uploads, Discipulado,
 * Eventos, Solicitações de Oração, Contas e PIX, Página Institucional,
 * Pastores, Privacidade e LGPD, Como Acessar.
 * Tesoureiro: somente leitura nesses módulos; tem permissão de editar/excluir/baixar/enviar
 * apenas na aba Caixa Diário (essa página não usa canWriteInRestrictedModules).
 */
const READ_ONLY_ROLES: UserRole[] = ['membro', 'congregado', 'tesoureiro'];

/** Retorna true se o usuário PODE criar/editar/excluir/imprimir/baixar nesses módulos. */
export function canWriteInRestrictedModules(role: UserRole | undefined): boolean {
  if (!role) return false;
  return !READ_ONLY_ROLES.includes(role);
}
