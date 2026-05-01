import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey !== 'placeholder-key';

if (!isSupabaseConfigured) {
    const hint = 'Configure o .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Supabase → Settings → API).';
    console.error('[Supabase]', hint);
}

/** Mensagem amigável quando a API do Supabase retorna "Invalid API key" (chave ausente ou errada). */
export const SUPABASE_CONFIG_HINT = 'Chave do Supabase inválida ou não configurada. Crie o arquivo .env.local na raiz do projeto com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (painel Supabase → Settings → API) e reinicie o servidor (npm run dev).';

const effectiveUrl = supabaseUrl || 'https://placeholder.supabase.co';
const effectiveKey = supabaseAnonKey || 'placeholder-key';

/** Workaround para erro "LockManager lock auth-token timed out" no Supabase.
 * Evita deadlock quando múltiplas abas ou o browser mantém locks travados.
 * @see https://github.com/supabase/supabase-js/issues/1594
 */
const noOpLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn();

export const supabase = createClient<Database>(effectiveUrl, effectiveKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        lock: noOpLock,
    },
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
    console.error('Supabase error:', error);

    if (error.message) {
        return error.message;
    }

    return 'An unexpected error occurred';
}

// Helper function to check if user is authenticated
export async function isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
}

// Helper function to get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/** Testa conexão com Supabase e retorna diagnóstico para a tela de login */
export async function testSupabaseConnection(): Promise<{
    urlConfigured: boolean;
    keyConfigured: boolean;
    ok: boolean;
    error?: string;
}> {
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const urlConfigured = !!url && !url.includes('placeholder');
    const keyConfigured = !!key && key !== 'placeholder-key';

    if (!urlConfigured || !keyConfigured) {
        return { urlConfigured, keyConfigured, ok: false, error: 'Variáveis não configuradas no build.' };
    }

    try {
        const { error } = await supabase.auth.getSession();
        if (error) {
            const msg = error.message || String(error);
            return { urlConfigured, keyConfigured, ok: false, error: msg };
        }
        return { urlConfigured, keyConfigured, ok: true };
    } catch (err: any) {
        const msg = err?.message || String(err);
        return { urlConfigured, keyConfigured, ok: false, error: msg };
    }
}

// Helper function to get current user profile
export async function getCurrentUserProfile() {
    const user = await getCurrentUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}
