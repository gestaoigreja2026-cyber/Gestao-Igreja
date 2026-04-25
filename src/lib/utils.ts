import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna a URL base da aplicação.
 * Prioridade: VITE_APP_URL > window.location.origin
 * Se estiver em localhost e não houver VITE_APP_URL, retorna um aviso no console.
 */
export function getAppUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  const origin = window.location.origin;

  // Detecta se está em ambiente de desenvolvimento local
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    console.warn('⚠️ [getAppUrl] Aplicação rodando em localhost. Configure VITE_APP_URL no .env para links de produção funcionarem.');
  }

  return origin;
}
