import { supabase } from '@/lib/supabaseClient';

export interface AsaasCustomer {
    id: string;
    name: string;
    email: string;
    cpfCnpj: string;
}

export interface AsaasSubscription {
    id: string;
    value: number;
    nextDueDate: string;
    status: string;
}

/**
 * Serviço para gerenciar a integração com o Asaas.
 * IMPORTANTE: As chaves de API devem ser configuradas apenas no Supabase (Edge Functions)
 * para evitar exposição no frontend.
 */
export const asaasService = {
    /**
     * Busca o status atual da assinatura no Asaas via Edge Function.
     */
    async getSubscriptionStatus(churchId: string) {
        try {
            // Chamamos uma Edge Function (que criaremos ou você deve configurar)
            // para que a chave do Asaas fique protegida no servidor.
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { action: 'get_status', churchId }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar status no Asaas:', error);
            return null;
        }
    },

    /**
     * Gera um link de pagamento ou boleto para a igreja.
     */
    async createPaymentLink(churchId: string) {
        try {
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { action: 'create_link', churchId }
            });

            if (error) throw error;
            return data.url;
        } catch (error) {
            console.error('Erro ao gerar link de pagamento:', error);
            return null;
        }
    }
};
