import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Building2, Eye, Loader2 } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ChurchNetwork() {
    useDocumentTitle('Rede de Igrejas');
    const { user, switchChurch } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    
    const [churches, setChurches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        loadNetwork();
    }, [user]);

    const loadNetwork = async () => {
        if (!user) return;
        
        try {
            // 1. Obter o array de managed_churches do profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('managed_churches')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            const managedIds = profile?.managed_churches || [];

            
            if (managedIds.length > 0) {
                // 2. Buscar as igrejas vinculadas
                const { data: churchesData, error: churchesError } = await supabase
                    .from('churches')
                    .select('*')
                    .in('id', managedIds)
                    .order('name');
                    
                if (churchesError) throw churchesError;
                setChurches(churchesData || []);
            } else {
                setChurches([]);
            }
            
        } catch (error: any) {
            console.error('Erro ao carregar rede:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar sua rede de igrejas.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleAccessChurch = (church: any) => {
        // Usa o switchChurch do AuthContext para trocar o contexto (já existe e é usado pelo superadmin)
        switchChurch(church.id, church.name);
        toast({ title: 'Acesso Iniciado', description: `Visualizando dados de ${church.name}` });
        navigate('/dashboard');
    };

    const getMetadataChurches = () => {
        let metaChurches = user?.user_metadata?.managed_churches;
        if (!metaChurches || metaChurches.length === 0) {
           const backup = localStorage.getItem(`pending_churches_${user?.email?.toLowerCase()}`);
           if (backup) metaChurches = backup;
        }

        if (typeof metaChurches === 'string') {
            try { metaChurches = JSON.parse(metaChurches); } catch(e) {}
        }
        return Array.isArray(metaChurches) ? metaChurches : [];
    };

    const forceSync = async () => {
        try {
            setLoading(true);
            const metadataChurches = getMetadataChurches();
            if (metadataChurches.length > 0) {
                const { error } = await supabase.from('profiles').update({
                    managed_churches: metadataChurches
                }).eq('id', user!.id);
                if (error) throw error;
                toast({ title: 'Sucesso', description: 'Permissões sincronizadas!' });
                window.location.reload();
            } else {
                toast({ title: 'Aviso', description: 'Nenhuma permissão pendente encontrada no seu perfil oculto.' });
            }
        } catch (e: any) {
            toast({ title: 'Erro', description: e.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                    <Network className="h-8 w-8" />
                    Rede de Igrejas
                </h1>
                <p className="text-muted-foreground mt-2">
                    Visão de supervisão. Acesse o painel das igrejas vinculadas a você em modo leitura.
                </p>
            </div>

            {churches.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold">Nenhuma igreja vinculada</h3>
                        <p className="text-muted-foreground mb-4">Você ainda não tem igrejas atribuídas à sua supervisão.</p>
                        <Button onClick={forceSync} variant="outline" size="sm">
                            Sincronizar Permissões Manuais
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {churches.map((church) => (
                        <Card key={church.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <span className="truncate">{church.name}</span>
                                </CardTitle>
                                <CardDescription className="truncate">{church.slug}.igrejadigital.com</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    className="w-full gap-2" 
                                    variant="secondary"
                                    onClick={() => handleAccessChurch(church)}
                                >
                                    <Eye className="h-4 w-4" />
                                    Acessar (Leitura)
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
