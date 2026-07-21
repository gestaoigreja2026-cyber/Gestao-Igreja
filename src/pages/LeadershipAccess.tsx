import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert, KeyRound, Eye, EyeOff, Building2 } from 'lucide-react';
import { UserRole } from '@/types';
import { membersService } from '@/services/members.service';

// Cria um client secundário para cadastrar usuários sem deslogar o admin/pastor atual
const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const authAdminClient = createClient(supabaseAdminUrl, supabaseAdminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const ROLES_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'secretario', label: 'Secretário' },
    { value: 'tesoureiro', label: 'Tesoureiro' },
    { value: 'lider_celula', label: 'Líder de Célula' },
    { value: 'lider_ministerio', label: 'Líder de Ministério' },
    { value: 'diretor_patrimonio', label: 'Diretor de Patrimônio' },
];

export default function LeadershipAccess() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [managedChurches, setManagedChurches] = useState<{ id: string; name: string }[]>([]);
    const [currentChurchName, setCurrentChurchName] = useState<string>('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '' as UserRole | '',
        selectedChurchId: '',
    });

    const isPastorAdmin = user?.role === 'pastor_admin';
    const isAuthorized = user?.role === 'pastor' || user?.role === 'admin' || user?.role === 'superadmin' || isPastorAdmin;

    // Carrega as igrejas da rede do pastor_admin ou nome da igreja atual
    useEffect(() => {
        if (isPastorAdmin) {
            const loadManagedChurches = async () => {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('managed_churches')
                    .eq('id', user!.id)
                    .single();

                if (profile?.managed_churches && profile.managed_churches.length > 0) {
                    const { data: churches } = await supabase
                        .from('churches')
                        .select('id, name')
                        .in('id', profile.managed_churches)
                        .order('name');
                    if (churches) setManagedChurches(churches);
                }
            };
            loadManagedChurches();
        } else if (user?.churchId) {
            // Carregar nome da igreja atual para não-pastor_admin
            const loadCurrentChurch = async () => {
                const { data: church } = await supabase
                    .from('churches')
                    .select('name')
                    .eq('id', user.churchId)
                    .single();
                if (church) setCurrentChurchName(church.name);
            };
            loadCurrentChurch();
        }
    }, [isPastorAdmin, user]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-bold">Acesso Negado</h2>
                <p className="text-muted-foreground">Apenas o Pastor ou Administrador pode gerenciar acessos de liderança.</p>
            </div>
        );
    }

    // Determina qual church_id usar: pastor_admin seleciona, pastor usa a própria igreja original
    const getTargetChurchId = () => {
        if (isPastorAdmin) return formData.selectedChurchId;
        // Se o usuário for superadmin visualizando uma igreja, usar a igreja que está visualizando
        if (user?.role === 'superadmin' && user?.churchId) {
            return user.churchId;
        }
        // Para pastor regular, usar a igreja original do perfil (ignorando viewingChurch)
        return user?.churchId || '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.password || !formData.role) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Preencha todos os campos para criar o acesso.',
                variant: 'destructive'
            });
            return;
        }

        const targetChurchId = getTargetChurchId();

        if (!targetChurchId) {
            toast({
                title: 'Erro',
                description: isPastorAdmin
                    ? 'Selecione a igreja onde este líder vai atuar.'
                    : 'Sua conta não está vinculada a nenhuma igreja.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Criar o usuário no Supabase Auth usando o client secundário (não muda a sessão atual)
            const { data: authData, error: authError } = await authAdminClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: formData.role,
                        churchId: targetChurchId
                    }
                }
            });

            if (authError) throw authError;

            if (authData?.user) {
                // 2. Garantir que o profile tenha os dados corretos
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.name,
                        role: formData.role,
                        church_id: targetChurchId
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Erro ao atualizar perfil:', profileError);
                }

                // Sincronizar com a tabela de membros para aparecer imediatamente nas listas
                try {
                    await membersService.create({
                        name: formData.name,
                        email: formData.email,
                        status: 'ativo'
                    }, targetChurchId);
                } catch (memberSyncError: any) {
                    console.error('Erro ao sincronizar novo líder com a tabela members:', memberSyncError);
                    throw new Error(`Falha ao adicionar à lista de membros: ${memberSyncError.message || JSON.stringify(memberSyncError)}`);
                }

                const churchName = isPastorAdmin
                    ? managedChurches.find(c => c.id === targetChurchId)?.name || 'Igreja selecionada'
                    : 'sua igreja';

                toast({
                    title: 'Acesso Criado!',
                    description: `O acesso para ${formData.name} (${ROLES_OPTIONS.find(r => r.value === formData.role)?.label}) foi criado em ${churchName}.`,
                });

                // Limpar form mantendo a igreja selecionada
                setFormData(prev => ({ name: '', email: '', password: '', role: '', selectedChurchId: prev.selectedChurchId }));
            }

        } catch (error: any) {
            console.error('Erro ao criar acesso:', error);
            toast({
                title: 'Erro ao criar acesso',
                description: error.message || 'Ocorreu um erro inesperado.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                    <KeyRound className="h-8 w-8" />
                    Acessos de Liderança
                </h1>
                <p className="text-muted-foreground mt-2">
                    {isPastorAdmin
                        ? 'Crie contas de acesso para líderes nas igrejas da sua rede de supervisão.'
                        : 'Crie contas de acesso (logins) para a sua equipe de liderança. Cada cargo possui permissões específicas no sistema.'}
                </p>
                {!isPastorAdmin && currentChurchName && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                            Criando acessos para: {currentChurchName}
                        </span>
                    </div>
                )}
            </div>

            <Card className="border-2 shadow-sm">
                <CardHeader className="bg-primary/5 rounded-t-xl border-b border-primary/10">
                    <CardTitle>Novo Acesso</CardTitle>
                    <CardDescription>Preencha os dados do líder que receberá acesso ao sistema.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Seletor de Igreja — só aparece para pastor_admin */}
                        {isPastorAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="church" className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Igreja da Rede
                                </Label>
                                <Select
                                    disabled={loading}
                                    value={formData.selectedChurchId}
                                    onValueChange={(val) => setFormData({...formData, selectedChurchId: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a igreja onde o líder vai atuar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {managedChurches.map(church => (
                                            <SelectItem key={church.id} value={church.id}>{church.name}</SelectItem>
                                        ))}
                                        {managedChurches.length === 0 && (
                                            <SelectItem value="none" disabled>Nenhuma igreja vinculada à sua rede</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input 
                                id="name" 
                                placeholder="Ex: João Silva" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Cargo / Permissão</Label>
                            <Select 
                                disabled={loading}
                                value={formData.role} 
                                onValueChange={(val) => setFormData({...formData, role: val as UserRole})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o cargo do líder..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail de Acesso</Label>
                            <Input 
                                id="email" 
                                type="email"
                                placeholder="lider@exemplo.com" 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <Label htmlFor="password">Senha de Acesso</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Mínimo 6 caracteres" 
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    disabled={loading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-4" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando acesso...
                                </>
                            ) : (
                                'Criar Conta de Acesso'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
