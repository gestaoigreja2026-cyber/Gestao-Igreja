import { describe, it, expect, beforeEach } from 'vitest';
import { PLAN_CONFIG, PROMO_MAX_CHURCHES, PROMO_MAX_MEMBERS } from './useSubscriptionPlan';
import { saveLocalAssetPhoto, getLocalAssetPhoto } from '@/services/assets.service';

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

describe('Drive Local da Igreja — Fotos do Patrimônio', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true });
  });

  it('salva, recupera e remove a foto do patrimônio no Drive Local da Igreja', () => {
    const assetId = 'asset-123';
    const fakeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

    saveLocalAssetPhoto(assetId, fakeDataUrl);
    expect(getLocalAssetPhoto(assetId)).toBe(fakeDataUrl);

    saveLocalAssetPhoto(assetId, undefined);
    expect(getLocalAssetPhoto(assetId)).toBeUndefined();
  });
});
