import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, User, Mail, CreditCard, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';

export default function Checkout() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        churchName: '',
        churchSlug: '',
        adminName: '',
        adminEmail: '',
        cpfCnpj: ''
    });

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, churchSlug: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Chama a Edge Function para iniciar o checkout
            const { data, error } = await supabase.functions.invoke('asaas-integration', {
                body: { 
                    action: 'init_checkout', 
                    ...formData 
                }
            });

            if (error) throw error;

            if (data?.url) {
                toast({
                    title: 'Iniciando pagamento',
                    description: 'Você será redirecionado para o ambiente seguro do Asaas.',
                });
                // Aguarda um momento para o usuário ler o toast e redireciona
                setTimeout(() => {
                    window.location.href = data.url;
                }, 1500);
            } else {
                throw new Error('Falha ao gerar link de pagamento.');
            }
        } catch (error: any) {
            console.error('Erro no checkout:', error);
            toast({
                title: 'Erro no cadastro',
                description: error.message || 'Ocorreu um erro ao processar sua solicitação.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-12 px-4">
            <div className="mb-8 scale-90">
                <Logo size="lg" />
            </div>

            <div className="max-w-4xl w-full grid md:grid-cols-5 gap-8">
                {/* Resumo do Plano */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
                        <div className="bg-primary p-4 text-primary-foreground text-center font-bold">
                            PLANO EXCELÊNCIA
                        </div>
                        <CardHeader>
                            <CardTitle className="text-3xl font-black">R$ 75,00<span className="text-sm font-normal text-muted-foreground ml-1">/mês</span></CardTitle>
                            <CardDescription>Nos 3 primeiros meses (depois R$ 150,00)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Igreja Ilimitada (Membros/Células)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Relatórios Financeiros e Atas</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>App PWA para todos os Membros</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Cancele a qualquer momento</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Suporte Prioritário</span>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/50 p-4 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Pagamento seguro via Asaas
                            </div>
                        </CardFooter>
                    </Card>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-5 w-5" /> Ativação Automática
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Assim que o pagamento for confirmado, você receberá um e-mail com suas credenciais de acesso e sua igreja será criada instantaneamente.
                        </p>
                    </div>
                </div>

                {/* Formulário de Cadastro */}
                <Card className="md:col-span-3 shadow-2xl border-none">
                    <CardHeader>
                        <CardTitle>Dados da Igreja</CardTitle>
                        <CardDescription>Preencha as informações para criar sua conta.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Church className="h-4 w-4 text-muted-foreground" /> Nome da Igreja
                                    </label>
                                    <Input 
                                        placeholder="Ex: Igreja Batista Renovada" 
                                        required 
                                        value={formData.churchName}
                                        onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-muted-foreground" /> URL da sua Igreja (Slug)
                                    </label>
                                    <div className="flex items-center group">
                                        <div className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-xs text-muted-foreground">
                                            app.gestaoigreja.com/
                                        </div>
                                        <Input 
                                            placeholder="nome-da-igreja" 
                                            className="rounded-l-none" 
                                            required 
                                            value={formData.churchSlug}
                                            onChange={handleSlugChange}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Este será o link de acesso da sua igreja.</p>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

                            <CardTitle className="text-lg">Dados do Administrador</CardTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" /> Nome Completo
                                    </label>
                                    <Input 
                                        placeholder="Seu nome" 
                                        required 
                                        value={formData.adminName}
                                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-muted-foreground" /> CPF ou CNPJ
                                    </label>
                                    <Input 
                                        placeholder="Somente números" 
                                        required 
                                        value={formData.cpfCnpj}
                                        onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" /> E-mail de Acesso
                                    </label>
                                    <Input 
                                        type="email" 
                                        placeholder="exemplo@email.com" 
                                        required 
                                        value={formData.adminEmail}
                                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Você usará este e-mail para fazer login.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button 
                                type="submit" 
                                className="w-full py-7 text-xl font-bold rounded-xl shadow-xl shadow-primary/30 gap-3 group"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CreditCard className="h-6 w-6" />}
                                ASSINAR AGORA
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <p className="text-[11px] text-center text-muted-foreground">
                                Ao assinar, você concorda com nossos Termos de Uso e Política de Privacidade.
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
