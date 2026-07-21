import { useState, useEffect, useRef } from 'react';
import {
    Building2,
    Users,
    UserCheck,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    ExternalLink,
    ShieldCheck,
    TrendingUp,
    Loader2,
    BarChart3,
    DollarSign,
    AlertCircle,
    Pause,
    Play,
    Banknote,
    XCircle,
    History,
    Copy,
    Upload,
    ImageIcon,
    CheckCircle2,
    Download,
    Network,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { churchesService, Church } from '@/services/churches.service';
import { SUBSCRIPTION_PIX } from '@/lib/subscriptionConfig';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { SuperAdminNetwork } from '@/components/SuperAdminNetwork';

const MAX_CHURCHES = 100;

type TabValue = 'gestao' | 'relatorios' | 'mensalidades' | 'logs_asaas' | 'rede';

export default function SuperAdmin() {
    useDocumentTitle('Painel Root - 100 Igrejas');
    const navigate = useNavigate();
    const { user, switchChurch } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loadingReports, setLoadingReports] = useState(false);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [churches, setChurches] = useState<Church[]>([]);
    const [report, setReport] = useState<{ churchId: string; churchName: string; slug: string; memberCount: number; userCount: number; createdAt: string }[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalChurches: 0, totalMembers: 0, totalUsers: 0 });
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingChurch, setEditingChurch] = useState<Church | null>(null);
    const [activeTab, setActiveTab] = useState<TabValue>('gestao');
    const { toast } = useToast();

    const [formData, setFormData] = useState({ name: '', slug: '', adminEmail: '', logo_url: '', banner_url: '' });
    const [submitting, setSubmitting] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const [actionChurchId, setActionChurchId] = useState<string | null>(null);
    const [excludeConfirm, setExcludeConfirm] = useState<{ churchId: string; name: string } | null>(null);
    const [removeChurchConfirm, setRemoveChurchConfirm] = useState<{ id: string; name: string } | null>(null);
    const [historyDialog, setHistoryDialog] = useState<{ churchId: string; churchName: string } | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<{ paid_at: string; amount: number; registered_by_name: string; source: string }[]>([]);
    const [asaasDialog, setAsaasDialog] = useState<{ churchId: string; churchName: string; customerId: string; subscriptionId: string } | null>(null);
    const [asaasLogs, setAsaasLogs] = useState<any[]>([]);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    useEffect(() => {
        // Segurança: Bloqueia acesso se não for superadmin
        if (user && user.role !== 'superadmin') {
            toast({
                title: 'Acesso Negado',
                description: 'Você não tem permissão para acessar o Painel Root.',
                variant: 'destructive'
            });
            navigate('/dashboard');
            return;
        }

        loadData();
        loadSubscriptions(); // Carrega assinaturas para ter dados na aba Gestão também
    }, [user, navigate]);

    useEffect(() => {
        if (activeTab === 'relatorios') loadReports();
        if (activeTab === 'mensalidades') loadSubscriptions();
        if (activeTab === 'logs_asaas') loadAsaasLogs();
    }, [activeTab]);

    async function loadAsaasLogs() {
        try {
            const { data, error } = await supabase
                .from('asaas_webhooks')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            setAsaasLogs(data || []);
        } catch (e) {
            console.error('Erro ao carregar logs:', e);
        }
    }

    useEffect(() => {
        if (historyDialog) {
            churchesService.getChurchSubscriptionPayments(historyDialog.churchId).then(setPaymentHistory);
        }
    }, [historyDialog]);

    async function loadData() {
        try {
            setLoading(true);
            const [churchesData, statsData] = await Promise.all([
                churchesService.getAll(),
                churchesService.getGlobalStats()
            ]);
            setChurches(churchesData || []);
            setStats(statsData);
        } catch (error) {
            console.error('Erro ao carregar dados root:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar as informações do painel root.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    async function loadReports() {
        try {
            setLoadingReports(true);
            const data = await churchesService.getChurchReport();
            setReport(data);
        } catch (e) {
            toast({ title: 'Erro', description: 'Não foi possível carregar relatórios.', variant: 'destructive' });
        } finally {
            setLoadingReports(false);
        }
    }

    async function loadSubscriptions() {
        try {
            setLoadingSubs(true);
            const data = await churchesService.getSubscriptions();
            setSubscriptions(data);
        } catch (e) {
            toast({ title: 'Erro', description: 'Não foi possível carregar mensalidades.', variant: 'destructive' });
        } finally {
            setLoadingSubs(false);
        }
    }

    async function handleSubscriptionAction(
        churchId: string,
        churchName: string,
        action: 'suspend' | 'resume' | 'registerPayment' | 'exclude'
    ) {
        setActionChurchId(churchId);
        try {
            if (action === 'suspend') {
                await churchesService.suspendChurchSubscription(churchId);
                toast({ title: 'Serviço suspenso', description: `${churchName} — acesso interrompido.` });
            } else if (action === 'resume') {
                await churchesService.resumeChurchSubscription(churchId);
                toast({ title: 'Serviço retomado', description: `${churchName} — acesso liberado.` });
            } else if (action === 'registerPayment') {
                await churchesService.registerPayment(churchId);
                toast({ title: 'Pagamento registrado', description: `${churchName} — sistema ativo até o próximo vencimento.` });
                if (historyDialog?.churchId === churchId) {
                    churchesService.getChurchSubscriptionPayments(churchId).then(setPaymentHistory);
                }
            } else if (action === 'exclude') {
                await churchesService.cancelChurchSubscription(churchId);
                toast({ title: 'Assinatura cancelada', description: `${churchName} — assinatura excluída.` });
                setExcludeConfirm(null);
            }
            loadSubscriptions();
        } catch (e: any) {
            toast({ title: 'Erro', description: e?.message ?? 'Não foi possível executar a ação.', variant: 'destructive' });
        } finally {
            setActionChurchId(null);
        }
    }

    const handleOpenDialog = (church?: Church) => {
        if (church) {
            setEditingChurch(church);
            setFormData({ name: church.name, slug: church.slug, adminEmail: '', logo_url: (church as any).logo_url || '', banner_url: (church as any).banner_url || '' });
        } else {
            setEditingChurch(null);
            setFormData({ name: '', slug: '', adminEmail: '', logo_url: '', banner_url: '' });
        }
        setUploadSuccess(false);
        setIsDialogOpen(true);
    };

    const handleLogoUpload = async (file: File) => {
        if (!file) return;
        setUploadingLogo(true);
        setUploadSuccess(false);
        try {
            // Garante que o bucket 'logos' existe (ignora erro se já existir)
            await supabase.storage.createBucket('logos', { public: true }).catch(() => {});

            const ext = file.name.split('.').pop();
            const slug = formData.slug || `church-${Date.now()}`;
            const fileName = `${slug}-${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(fileName, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
            const publicUrl = urlData?.publicUrl;

            if (!publicUrl) throw new Error('Não foi possível obter a URL pública da imagem.');

            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
            setUploadSuccess(true);
            toast({ title: 'Logo enviada!', description: 'A imagem foi salva e a URL foi preenchida automaticamente.' });
        } catch (e: any) {
            toast({ title: 'Erro no upload', description: e?.message || 'Não foi possível enviar a logo.', variant: 'destructive' });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleBannerUpload = async (file: File) => {
        if (!file) return;
        setUploadingBanner(true);
        setUploadSuccess(false);
        try {
            // Garante que o bucket 'banners' existe (ignora erro se já existir)
            await supabase.storage.createBucket('banners', { public: true }).catch(() => {});

            const ext = file.name.split('.').pop();
            const slug = formData.slug || `church-${Date.now()}`;
            const fileName = `${slug}-banner-${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(fileName, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
            const publicUrl = urlData?.publicUrl;

            if (!publicUrl) throw new Error('Não foi possível obter a URL pública da imagem.');

            setFormData(prev => ({ ...prev, banner_url: publicUrl }));
            setUploadSuccess(true);
            toast({ title: 'Banner enviado!', description: 'A imagem foi salva e a URL foi preenchida automaticamente.' });
        } catch (e: any) {
            toast({ title: 'Erro no upload', description: e?.message || 'Não foi possível enviar o banner.', variant: 'destructive' });
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleRemoveChurch = async () => {
        if (!removeChurchConfirm) return;
        try {
            await churchesService.delete(removeChurchConfirm.id);
            toast({ title: 'Igreja removida', description: `"${removeChurchConfirm.name}" foi excluída da plataforma.` });
            setRemoveChurchConfirm(null);
            loadData();
        } catch (e: any) {
            toast({ title: 'Erro', description: e?.message ?? 'Não foi possível remover a igreja.', variant: 'destructive' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stats.totalChurches >= MAX_CHURCHES && !editingChurch) {
            toast({ title: 'Limite atingido', description: `A plataforma suporta até ${MAX_CHURCHES} igrejas.`, variant: 'destructive' });
            return;
        }
        try {
            setSubmitting(true);
            if (editingChurch) {
                const updatePayload: any = { name: formData.name, slug: formData.slug };
                if (formData.logo_url !== undefined) updatePayload.logo_url = formData.logo_url || null;
                if (formData.banner_url !== undefined) updatePayload.banner_url = formData.banner_url || null;
                await churchesService.update(editingChurch.id, updatePayload);
                toast({ title: 'Sucesso', description: 'Igreja atualizada com sucesso.' });
            } else {
                await churchesService.create(formData);
                toast({ title: 'Sucesso', description: 'Nova igreja cadastrada com sucesso.' });
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Ocorreu um problema ao salvar as informações.';
            toast({ title: 'Erro', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredChurches = churches.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
    );

    const atLimit = stats.totalChurches >= MAX_CHURCHES;
    const canAddChurch = !atLimit;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">
                        Painel Super Admin — 100 Igrejas
                    </h1>
                </div>
                <Button onClick={() => handleOpenDialog()} disabled={!canAddChurch} className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" /> Nova Igreja
                </Button>
            </div>

            {atLimit && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Limite de {MAX_CHURCHES} igrejas atingido. Novas igrejas podem se cadastrar pela página de vendas após assinatura.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <Card key={i} className="h-32 bg-muted/20" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="relative overflow-hidden group border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" /> Igrejas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalChurches} <span className="text-lg font-normal text-muted-foreground">/ {MAX_CHURCHES}</span></div>
                            <p className="text-xs text-muted-foreground mt-1">Capacidade da plataforma</p>
                        </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden group border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-500" /> Membros Totais
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalMembers.toLocaleString('pt-BR')}</div>
                            <p className="text-xs text-muted-foreground mt-1">Soma de todas as congregações</p>
                        </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden group border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-emerald-500" /> Usuários Ativos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalUsers}</div>
                            <p className="text-xs text-muted-foreground mt-1">Contas vinculadas</p>
                        </CardContent>
                    </Card>
                    <Card className="relative overflow-hidden group border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-500" /> Receita Mensal
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">R$ {(stats.totalChurches * 150).toLocaleString('pt-BR')}</div>
                            <p className="text-xs text-muted-foreground mt-1">R$ 150/igreja × {stats.totalChurches} igrejas</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto p-1 scrollbar-hide snap-x">
                    <TabsTrigger value="gestao" className="gap-2 shrink-0 snap-start">
                        <Building2 className="h-4 w-4" /> Gestão
                    </TabsTrigger>
                    <TabsTrigger value="relatorios" className="gap-2 shrink-0 snap-start">
                        <BarChart3 className="h-4 w-4" /> Relatórios
                    </TabsTrigger>
                    <TabsTrigger value="rede" className="gap-2 shrink-0 snap-start">
                        <Network className="h-4 w-4" /> PastorAdmin
                    </TabsTrigger>
                    <TabsTrigger value="mensalidades" className="gap-2 shrink-0 snap-start">
                        <DollarSign className="h-4 w-4" /> Mensalidades
                    </TabsTrigger>
                    <TabsTrigger value="logs_asaas" className="gap-2 shrink-0 snap-start">
                        <History className="h-4 w-4" /> Logs Asaas
                    </TabsTrigger>
                    </TabsList>

                <TabsContent value="gestao" className="mt-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Lista de Igrejas</CardTitle>
                                    <CardDescription>Gerencie as igrejas cadastradas. Novas igrejas se cadastram pela página de vendas.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Buscar por nome ou slug..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                                    <p className="text-muted-foreground">Carregando igrejas...</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto min-w-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Igreja</TableHead>
                                                <TableHead>Slug</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Criado em</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredChurches.map((church) => (
                                                <TableRow key={church.id} className="group transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                <Building2 className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <span className="font-semibold">{church.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">{church.slug}</code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
                                                            {(church as any).status || 'ATIVA'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {format(new Date(church.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56">
                                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleOpenDialog(church)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { switchChurch(church.id, church.name); navigate('/dashboard'); }}>
                                                                    <ExternalLink className="mr-2 h-4 w-4" /> Acessar Painel
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleSubscriptionAction(church.id, church.name, 'registerPayment')}
                                                                    disabled={actionChurchId === church.id}
                                                                >
                                                                    {actionChurchId === church.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                                                                    Confirmar pagamento
                                                                </DropdownMenuItem>
                                                                {(() => {
                                                                    const sub = subscriptions.find((s) => (s.church_id ?? s.churchId) === church.id);
                                                                    const status = sub?.status ?? 'ativa';
                                                                    const isActive = status === 'ativa' || status === 'trial';
                                                                    const isSuspended = status === 'suspensa' || status === 'inadimplente';
                                                                    if (isActive) return (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleSubscriptionAction(church.id, church.name, 'suspend')}
                                                                        disabled={actionChurchId === church.id}
                                                                    >
                                                                        {actionChurchId === church.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                                                                        Desativar serviço
                                                                    </DropdownMenuItem>
                                                                );
                                                                    if (isSuspended) return (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleSubscriptionAction(church.id, church.name, 'resume')}
                                                                        disabled={actionChurchId === church.id}
                                                                    >
                                                                        {actionChurchId === church.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                                                        Ativar serviço
                                                                    </DropdownMenuItem>
                                                                    );
                                                                    return null;
                                                                })()}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setRemoveChurchConfirm({ id: church.id, name: church.name })}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Remover Igreja
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredChurches.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma igreja encontrada.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="relatorios" className="mt-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle>Relatório Consolidado</CardTitle>
                            <CardDescription>Membros e usuários por igreja.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingReports ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Igreja</TableHead>
                                                <TableHead>Slug</TableHead>
                                                <TableHead className="text-right">Membros</TableHead>
                                                <TableHead className="text-right">Usuários</TableHead>
                                                <TableHead>Criado em</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.map((r) => (
                                                <TableRow key={r.churchId}>
                                                    <TableCell className="font-medium">{r.churchName}</TableCell>
                                                    <TableCell><code className="text-xs">{r.slug}</code></TableCell>
                                                    <TableCell className="text-right">{r.memberCount}</TableCell>
                                                    <TableCell className="text-right">{r.userCount}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {format(new Date(r.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {report.length === 0 && !loadingReports && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum dado encontrado.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mensalidades" className="mt-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle>Acompanhamento de Mensalidades</CardTitle>
                            <CardDescription>Gestão de assinaturas integrada ao Asaas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loadingSubs ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Igreja</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead>Próximo vencimento</TableHead>
                                                <TableHead>Último pagamento</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subscriptions.map((sub) => {
                                                const churchName = sub.churches?.name ?? sub.church_name ?? '—';
                                                const churchId = sub.church_id ?? sub.churchId;
                                                const status = sub.status ?? 'ativa';
                                                const nextDue = sub.next_due_at ?? sub.nextDueAt;
                                                const isActive = status === 'ativa' || status === 'ATIVO' || status === 'trial' || status === 'TRIAL';
                                                const isSuspended = status === 'suspensa' || status === 'SUSPENSO' || status === 'inadimplente' || status === 'INADIMPLENTE';
                                                const isCanceled = status === 'cancelada' || status === 'CANCELADO';
                                                const loading = actionChurchId === churchId;
                                                const statusLabel = status.toUpperCase();
                                                return (
                                                    <TableRow key={churchId ?? sub.id ?? Math.random()}>
                                                        <TableCell className="font-medium">{churchName}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={isSuspended || isCanceled ? 'destructive' : 'outline'}
                                                                className={isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                                                                {statusLabel}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">R$ {(sub.plan_amount ?? 150).toFixed(2)}</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {nextDue ? format(new Date(nextDue), "dd 'de' MMM, yyyy", { locale: ptBR }) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {sub.last_payment_at ? format(new Date(sub.last_payment_at), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {churchId && (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" onClick={() => { switchChurch(churchId, churchName); navigate('/dashboard'); }} title="Acessar igreja">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Button>
                                                                    {!isCanceled && (
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="sm" disabled={loading}>
                                                                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuLabel>Ações manuais</DropdownMenuLabel>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => setHistoryDialog({ churchId, churchName })} disabled={loading}>
                                                                                    <History className="h-4 w-4 mr-2" />
                                                                                    Ver histórico de pagamentos
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => setAsaasDialog({ 
                                                                                    churchId, 
                                                                                    churchName, 
                                                                                    customerId: sub.asaas_customer_id || '', 
                                                                                    subscriptionId: sub.asaas_subscription_id || '' 
                                                                                })} disabled={loading}>
                                                                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                                                                    Configurar Asaas
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleSubscriptionAction(churchId, churchName, 'registerPayment')} disabled={loading}>
                                                                                    <Banknote className="h-4 w-4 mr-2" />
                                                                                    Registrar pagamento
                                                                                </DropdownMenuItem>
                                                                                {isActive && (
                                                                                    <DropdownMenuItem onClick={() => handleSubscriptionAction(churchId, churchName, 'suspend')} disabled={loading}>
                                                                                        <Pause className="h-4 w-4 mr-2" />
                                                                                        Suspender
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                {isSuspended && (
                                                                                    <DropdownMenuItem onClick={() => handleSubscriptionAction(churchId, churchName, 'resume')} disabled={loading}>
                                                                                        <Play className="h-4 w-4 mr-2" />
                                                                                        Retomar serviço
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => setExcludeConfirm({ churchId, name: churchName })} disabled={loading} className="text-destructive focus:text-destructive">
                                                                                    <XCircle className="h-4 w-4 mr-2" />
                                                                                    Excluir / Cancelar assinatura
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {subscriptions.length === 0 && !loadingSubs && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                        Execute o script <code className="text-xs">supabase/church_subscriptions.sql</code> no Supabase para habilitar o acompanhamento automático.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs_asaas" className="mt-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle>Histórico de Webhooks Asaas</CardTitle>
                            <CardDescription>Acompanhe as notificações enviadas pelo gateway em tempo real.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Evento</TableHead>
                                            <TableHead>Cliente (Asaas)</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {asaasLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">
                                                    {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                                        {log.event}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">
                                                    {log.payload?.payment?.customer || '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                                        <Search className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {asaasLogs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    Nenhum evento registrado ainda.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="rede" className="mt-6">
                    <SuperAdminNetwork />
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-screen h-screen sm:w-[95vw] sm:max-w-[425px] sm:h-auto overflow-y-auto p-4 sm:p-6 rounded-xl">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{editingChurch ? 'Editar Igreja' : 'Cadastrar Nova Igreja'}</DialogTitle>
                            <DialogDescription>
                                Configure os dados básicos da igreja. Igrejas também podem se cadastrar automaticamente pela página de vendas.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Igreja</label>
                                <Input required placeholder="Ex: Igreja Central" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug / URL Amigável</label>
                                <Input required placeholder="Ex: igreja-central" value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                                <p className="text-[10px] text-muted-foreground">Identificador único. Não pode repetir.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Logo da Igreja</label>

                                {/* Área de upload */}
                                <div
                                    className="relative border-2 border-dashed border-primary/20 rounded-xl p-4 flex flex-col items-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
                                    onClick={() => !uploadingLogo && logoFileInputRef.current?.click()}
                                >
                                    <input
                                        ref={logoFileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleLogoUpload(file);
                                        }}
                                    />

                                    {formData.logo_url ? (
                                        <div className="flex items-center gap-4 w-full">
                                            <img
                                                src={formData.logo_url}
                                                alt="Logo da igreja"
                                                className="h-16 w-16 object-contain rounded-xl bg-white border shadow-sm"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/logo-app.png'; }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                {uploadSuccess && (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mb-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Logo enviada com sucesso!
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground truncate">{formData.logo_url}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-primary group-hover:underline cursor-pointer">Clique para trocar a imagem</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = document.createElement('a');
                                                            link.href = formData.logo_url;
                                                            link.download = `logo-${formData.slug || 'church'}.png`;
                                                            link.target = '_blank';
                                                            link.rel = 'noopener noreferrer';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                        Baixar
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Tamanho ideal: Quadrado (ex: 512x512) • Fundo transparente</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            {uploadingLogo ? (
                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <ImageIcon className="h-6 w-6 text-primary" />
                                                </div>
                                            )}
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {uploadingLogo ? 'Enviando...' : 'Clique para enviar a logo'}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WEBP ou SVG</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Tamanho ideal: Quadrado (ex: 512x512) • Fundo transparente</p>
                                            </div>
                                        </div>
                                    )}

                                    {uploadingLogo && (
                                        <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Campo URL manual como fallback */}
                                <details className="mt-1">
                                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors">Ou cole uma URL manualmente</summary>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Input
                                            type="url"
                                            placeholder="https://... (URL pública da imagem)"
                                            value={formData.logo_url}
                                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                            className="flex-1"
                                        />
                                        {formData.logo_url && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = formData.logo_url;
                                                    link.download = `logo-${formData.slug || 'church'}.png`;
                                                    link.target = '_blank';
                                                    link.rel = 'noopener noreferrer';
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="p-2 border rounded-xl hover:bg-muted transition-colors"
                                            >
                                                <Download className="h-4 w-4 text-primary" />
                                            </button>
                                        )}
                                    </div>
                                </details>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Banner de Culto</label>

                                {/* Área de upload do banner */}
                                <div
                                    className="relative border-2 border-dashed border-primary/20 rounded-xl p-4 flex flex-col items-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
                                    onClick={() => !uploadingBanner && bannerFileInputRef.current?.click()}
                                >
                                    <input
                                        ref={bannerFileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleBannerUpload(file);
                                        }}
                                    />

                                    {formData.banner_url ? (
                                        <div className="flex items-center gap-4 w-full">
                                            <img
                                                src={formData.banner_url}
                                                alt="Banner de culto"
                                                className="h-14 w-20 object-cover rounded-xl bg-white border shadow-sm"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                {uploadSuccess && (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mb-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Banner enviado com sucesso!
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground truncate">{formData.banner_url}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-primary group-hover:underline cursor-pointer">Clique para trocar a imagem</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = document.createElement('a');
                                                            link.href = formData.banner_url;
                                                            link.download = `banner-${formData.slug || 'church'}.png`;
                                                            link.target = '_blank';
                                                            link.rel = 'noopener noreferrer';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                        Baixar
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Tamanho ideal: 1200x320px (horizontal)</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-2">
                                            {uploadingBanner ? (
                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <ImageIcon className="h-6 w-6 text-primary" />
                                                </div>
                                            )}
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {uploadingBanner ? 'Enviando...' : 'Clique para enviar o banner'}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG ou WEBP</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Tamanho ideal: 1200x320px (horizontal)</p>
                                            </div>
                                        </div>
                                    )}

                                    {uploadingBanner && (
                                        <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Campo URL manual como fallback */}
                                <details className="mt-1">
                                    <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors">Ou cole uma URL manualmente</summary>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Input
                                            type="url"
                                            placeholder="https://... (URL pública da imagem)"
                                            value={formData.banner_url}
                                            onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                                            className="flex-1"
                                        />
                                        {formData.banner_url && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = formData.banner_url;
                                                    link.download = `banner-${formData.slug || 'church'}.png`;
                                                    link.target = '_blank';
                                                    link.rel = 'noopener noreferrer';
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="p-2 border rounded-xl hover:bg-muted transition-colors"
                                            >
                                                <Download className="h-4 w-4 text-primary" />
                                            </button>
                                        )}
                                    </div>
                                </details>
                            </div>
                            {!editingChurch && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">E-mail do Administrador Inicial</label>
                                    <Input type="email" placeholder="Ex: pastor@igreja.com" value={formData.adminEmail}
                                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} />
                                    <p className="text-[10px] text-muted-foreground">Se existir, será vinculado como Admin.</p>
                                </div>
                            )}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex gap-3 border border-amber-200 dark:border-amber-900">
                                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 dark:text-amber-400">
                                    Plataforma para até {MAX_CHURCHES} igrejas. Novas igrejas podem se cadastrar pela página de vendas e pagamento (R$ 150/mês).
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {editingChurch ? 'Salvar' : 'Criar Igreja'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!excludeConfirm}
                onOpenChange={(o) => !o && setExcludeConfirm(null)}
                title="Excluir / Cancelar assinatura"
                description={excludeConfirm ? `Tem certeza que deseja cancelar a assinatura de "${excludeConfirm.name}"? O serviço será interrompido.` : ''}
                onConfirm={() => excludeConfirm && handleSubscriptionAction(excludeConfirm.churchId, excludeConfirm.name, 'exclude')}
                confirmLabel="Sim, cancelar"
                variant="destructive"
            />

            <ConfirmDialog
                open={!!removeChurchConfirm}
                onOpenChange={(o) => !o && setRemoveChurchConfirm(null)}
                title="Remover Igreja"
                description={removeChurchConfirm ? `Tem certeza que deseja remover "${removeChurchConfirm.name}" da plataforma? Esta ação é irreversível e excluirá a igreja e seus dados vinculados.` : ''}
                onConfirm={handleRemoveChurch}
                confirmLabel="Sim, remover"
                variant="destructive"
            />

            <Dialog open={!!asaasDialog} onOpenChange={(o) => !o && setAsaasDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configurar Integração Asaas</DialogTitle>
                        <DialogDescription>
                            {asaasDialog ? `Vincule a igreja "${asaasDialog.churchName}" aos IDs do Asaas para automação.` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ID do Cliente (Asaas)</label>
                            <Input 
                                placeholder="Ex: cus_000005123456" 
                                value={asaasDialog?.customerId || ''} 
                                onChange={(e) => setAsaasDialog(prev => prev ? { ...prev, customerId: e.target.value } : null)}
                            />
                            <p className="text-[10px] text-muted-foreground">Opcional. Usado para identificar o cliente nos Webhooks.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ID da Assinatura (Asaas)</label>
                            <Input 
                                placeholder="Ex: sub_000005123456" 
                                value={asaasDialog?.subscriptionId || ''} 
                                onChange={(e) => setAsaasDialog(prev => prev ? { ...prev, subscriptionId: e.target.value } : null)}
                            />
                            <p className="text-[10px] text-muted-foreground">Opcional. Usado para controle de recorrência.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAsaasDialog(null)}>Cancelar</Button>
                        <Button onClick={async () => {
                            if (!asaasDialog) return;
                            try {
                                setSubmitting(true);
                                const { error } = await supabase.from('church_subscriptions').update({
                                    asaas_customer_id: asaasDialog.customerId,
                                    asaas_subscription_id: asaasDialog.subscriptionId
                                }).eq('church_id', asaasDialog.churchId);
                                
                                if (error) throw error;
                                toast({ title: 'Sucesso', description: 'Dados do Asaas atualizados.' });
                                setAsaasDialog(null);
                                loadSubscriptions();
                            } catch (e: any) {
                                toast({ title: 'Erro', description: e.message, variant: 'destructive' });
                            } finally {
                                setSubmitting(false);
                            }
                        }} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Configuração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Webhook</DialogTitle>
                        <DialogDescription>Dados brutos recebidos do Asaas.</DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted p-4 rounded-xl overflow-auto max-h-[500px]">
                        <pre className="text-[10px] font-mono leading-relaxed">
                            {JSON.stringify(selectedLog?.payload, null, 2)}
                        </pre>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Histórico de pagamentos</DialogTitle>
                        <DialogDescription>
                            {historyDialog ? `${historyDialog.churchName} — quem pagou e quando` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto">
                        {paymentHistory.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">Nenhum pagamento registrado ainda.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Registrado por</TableHead>
                                        <TableHead>Origem</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentHistory.map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="text-sm">{p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}</TableCell>
                                            <TableCell className="text-right font-medium">R$ {Number(p.amount).toFixed(2)}</TableCell>
                                            <TableCell className="text-sm">{p.registered_by_name || '—'}</TableCell>
                                            <TableCell className="text-sm capitalize">{p.source === 'manual' ? 'Manual' : p.source}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
