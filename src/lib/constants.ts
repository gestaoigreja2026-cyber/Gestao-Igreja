/**
 * Constantes globais do app Gestão Igreja
 */

export const APP_NAME = 'Gestão Igreja';
export const APP_SHORT_NAME = 'Igreja';

/** Exibir opção SuperAdmin na tela de login? Apenas em dev ou quando VITE_SHOW_SUPERADMIN=true */
export const SHOW_SUPERADMIN_LOGIN =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_SUPERADMIN === 'true';

/** E-mails com acesso total (superadmin) – sempre sem restrições */
export const UNRESTRICTED_EMAILS: string[] = [
  'edukadoshmda@gmail.com',
];

export const DOCUMENT_CATEGORIES = {
  study: 'Estudos para Células',
  financial: 'Relatórios Financeiros',
  minutes: 'Atas',
  media: 'Fotos',
  videos: 'Vídeos e Cultos',
  baptism: 'Batismo',
  dedication: 'Apresentação',
  transfer: 'Transferência',
  roll: 'Rol',
  credential: 'Credencial',
} as const;

export const ROLES_LABELS: Record<string, string> = {
  superadmin: 'SuperAdmin',
  admin: 'Administrador',
  pastor: 'Pastor',
  secretario: 'Secretário',
  tesoureiro: 'Tesoureiro',
  lider_celula: 'Líder de Célula',
  lider_ministerio: 'Líder de Ministério',
  diretor_patrimonio: 'Diretor(a) de Patrimônio',
  membro: 'Membro',
  congregado: 'Congregado',
  aluno: 'Aluno',
};

/** Todos os roles do sistema (centralizado) */
export const ALL_ROLES = [
  'superadmin', 'admin', 'pastor', 'secretario', 'tesoureiro',
  'lider_celula', 'lider_ministerio', 'diretor_patrimonio', 'membro', 'aluno', 'congregado',
] as const;

export const MEMBER_CATEGORIES = ['membro', 'congregado'] as const;
export const DEFAULT_CHURCH_NAME = 'Igreja Comunidade Cristã';
export const DEFAULT_CNPJ = '00.000.000/0001-00';
