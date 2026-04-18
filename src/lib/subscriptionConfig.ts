/**
 * Configuração de assinatura e pagamento PIX das mensalidades
 * Hotmart vende o app (assinatura inicial). Mensalidades vêm via PIX direto.
 */

/** Período de teste gratuito para novas igrejas (dias) */
export const TRIAL_DAYS = 7;

export const SUBSCRIPTION_PIX = {
  /** Chave PIX - Celular */
  pixKey: '(91) 99383-7093',
  /** Titular da conta */
  holderName: 'Luiz Eduardo Santos da Silva',
  /** Banco */
  bank: 'Nubank',
  /** E-mail para enviar comprovante */
  receiptEmail: 'gestaoigreja@gmail.com',
  /** Valor normal (após 50 primeiras igrejas) */
  fullPrice: 150,
  /** Valor com 50% OFF (50 primeiras igrejas) */
  promoPrice: 75,
  /** Quantidade de igrejas com desconto */
  promoSlots: 50,
} as const;

export const getSubscriptionPrice = (churchIndex: number): number => {
  return churchIndex <= SUBSCRIPTION_PIX.promoSlots ? SUBSCRIPTION_PIX.promoPrice : SUBSCRIPTION_PIX.fullPrice;
};

export const getSubscriptionPriceLabel = (churchIndex?: number): string => {
  if (churchIndex != null && churchIndex <= SUBSCRIPTION_PIX.promoSlots) {
    return `R$ ${SUBSCRIPTION_PIX.promoPrice.toFixed(2)}/mês`;
  }
  return `R$ ${SUBSCRIPTION_PIX.fullPrice.toFixed(2)}/mês`;
};
