import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Network } from 'lucide-react';

const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const authAdminClient = createClient(supabaseAdminUrl, supabaseAdminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

export function SuperAdminNetwork() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        managedChurches: [] as string[]
    });

    useEffect(() => {
        const fetchChurches = async () => {
            const { data, error } = await supabase.from('churches').select('id, name').order('name');
            if (data) setChurches(data);
        };
        fetchChurches();
    }, []);

    const toggleChurch = (id: string) => {
        setFormData(prev => ({
            ...prev,
            managedChurches: prev.managedChurches.includes(id) 
                ? prev.managedChurches.filter(c => c !== id)
                : [...prev.managedChurches, id]
        }));
    };

    const selectAllChurches = () => {
        setFormData(prev => ({ ...prev, managedChurches: churches.map(c => c.id) }));
    };

    const clearChurches = () => {
        setFormData(prev => ({ ...prev, managedChurches: [] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            toast({ title: 'Erro', description: 'Preencha nome, email e senha.', variant: 'destructive' });
            return;
        }
        if (!formData.managedChurches || formData.managedChurches.length === 0) {
            toast({ title: 'Erro', description: 'Você DEVE selecionar pelo menos uma igreja antes de criar.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            // Salvar no localStorage para resgate automático no primeiro login do pastor
            localStorage.setItem(`pending_churches_${formData.email.trim().toLowerCase()}`, JSON.stringify(formData.managedChurches));

            // 1. Criar usuário sem deslogar o superadmin
            const { data: authData, error: authError } = await authAdminClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: 'pastor_admin',
                        managed_churches: JSON.stringify(formData.managedChurches)
                    }
                }
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    throw new Error('Este e-mail já está cadastrado no sistema. Por favor, use um e-mail diferente para criar o PastorAdmin.');
                }
                throw authError;
            }

            if (authData?.user) {
                // 2. Atualizar o profile com managed_churches via RPC para ignorar RLS
                const { error: profileError } = await supabase.rpc('link_pastor_churches', {
                    pastor_id: authData.user.id,
                    church_ids: formData.managedChurches
                });

                if (profileError) throw profileError;

                // Tentar atualizar os outros dados livremente (pode falhar silenciosamente por RLS, mas o principal já foi)
                await supabase.from('profiles').update({
                    full_name: formData.name,
                    phone: formData.phone
                }).eq('id', authData.user.id);

                toast({ title: 'Sucesso', description: 'PastorAdmin criado com sucesso.' });
                setFormData({ name: '', email: '', phone: '', password: '', managedChurches: [] });
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Network className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Rede de Igrejas (PastorAdmin)</CardTitle>
                        <CardDescription>Crie um usuário PastorAdmin para gerenciar múltiplas igrejas.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder="Nome do Pastor"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                placeholder="(99) 99999-9999"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-mail</Label>
                            <Input 
                                type="email"
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha</Label>
                            <Input 
                                type="text"
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Igrejas Vinculadas ({formData.managedChurches.length} selecionadas)</Label>
                            <div className="space-x-2">
                                <Button type="button" variant="outline" size="sm" onClick={selectAllChurches}>Selecionar Todas</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={clearChurches}>Limpar</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-4 border rounded-xl bg-muted/20">
                            {churches.map(c => (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted/50 rounded-xl">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={formData.managedChurches.includes(c.id)}
                                        onChange={() => toggleChurch(c.id)}
                                    />
                                    <span className="text-sm truncate">{c.name}</span>
                                </label>
                            ))}
                            {churches.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Carregando igrejas...</p>}
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Criar PastorAdmin'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
