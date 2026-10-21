import { describe, it, expect } from 'vitest';
import { PLAN_CONFIG, PROMO_MAX_CHURCHES, PROMO_MAX_MEMBERS } from './useSubscriptionPlan';
import { isEmbeddedPhoto, sanitizePhotoUrlForDb } from '@/services/assets.service';

describe('Planos de Assinatura e Promoção de 20 Igrejas', () => {
  it('configura a promoção das primeiras 20 igrejas com limite de até 300 membros', () => {
    expect(PROMO_MAX_CHURCHES).toBe(20);
    expect(PROMO_MAX_MEMBERS).toBe(300);
    expect(PLAN_CONFIG.promo.maxMembers).toBe(300);
    expect(PLAN_CONFIG.promo.price).toBe(150);
  });

  it('mantém os limites padrão dos planos para retorno após 20 igrejas', () => {
    expect(PLAN_CONFIG.trial.maxMembers).toBe(30);
    expect(PLAN_CONFIG.starter.maxMembers).toBe(100);
    expect(PLAN_CONFIG.growth.maxMembers).toBe(500);
    expect(PLAN_CONFIG.professional.maxMembers).toBe(2000);
    expect(PLAN_CONFIG.enterprise.maxMembers).toBe(99999);
  });
});

describe('Sanitização de Fotos do Patrimônio (Google Drive institucional)', () => {
  it('detecta imagens embutidas (data URL base64)', () => {
    expect(isEmbeddedPhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isEmbeddedPhoto('gdrive:1a2b3c4d5e')).toBe(false);
    expect(isEmbeddedPhoto('https://drive.google.com/uc?id=123')).toBe(false);
    expect(isEmbeddedPhoto(null)).toBe(false);
    expect(isEmbeddedPhoto(undefined)).toBe(false);
  });

  it('bloqueia gravação de base64 no banco de dados e preserva referências do Drive', () => {
    // base64 deve virar undefined (não atualiza ou não grava base64 pesado no Supabase)
    expect(sanitizePhotoUrlForDb('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBeUndefined();

    // identificadores do Google Drive são permitidos
    expect(sanitizePhotoUrlForDb('gdrive:1a2b3c4d5e')).toBe('gdrive:1a2b3c4d5e');

    // URLs externas normais são permitidas
    expect(sanitizePhotoUrlForDb('https://example.com/foto.jpg')).toBe('https://example.com/foto.jpg');

    // Valores nulos ou vazios
    expect(sanitizePhotoUrlForDb('')).toBeNull();
    expect(sanitizePhotoUrlForDb(null)).toBeNull();
    expect(sanitizePhotoUrlForDb(undefined)).toBeUndefined();
  });
});
