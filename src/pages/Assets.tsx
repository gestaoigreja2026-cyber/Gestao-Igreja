import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package,
    Plus,
    Pencil,
    Trash2,
    Image as ImageIcon,
    Wrench,
    Camera,
    HardDrive,
    CheckCircle2,
    AlertTriangle,
    DollarSign,
    MapPin,
    Tag,
    Search,
    LayoutGrid,
    List,
    Eye,
    Download,
    ZoomIn,
    ZoomOut,
    Loader2,
    FolderOpen,
    X,
    QrCode,
    Calendar,
    ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { assetsService, isEmbeddedPhoto } from '@/services/assets.service';
import { AssetPhoto, resolveAssetPhotoUrl } from '@/components/AssetPhoto';
import { Asset, AssetSource, AssetStatus } from '@/types';
import { format } from 'date-fns';
import { AssetMaintenanceModal } from '@/components/AssetMaintenanceModal';
import { ExcelAdministrativeDashboardButton } from '@/components/ExcelAdministrativeDashboardButton';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { compressImageFile } from '@/utils/imageCompression';
import { googleDriveService } from '@/services/googleDrive.service';
import { cn } from '@/lib/utils';

// Formatadores de moeda brasileira
const formatCurrencyInput = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';

    const cents = parseInt(numericValue, 10);
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cents / 100);
};

const SUGGESTED_CATEGORIES = [
    'Som e Áudio',
    'Instrumentos Musicais',
    'Informática e Vídeo',
    'Mobiliário',
    'Climatização',
    'Veículos',
    'Imóveis',
    'Cozinha e Infantil',
];

function fileToDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
        reader.readAsDataURL(file);
    });
}

export default function Assets() {
    const { user, churchId, viewingChurch } = useAuth();
    const effectiveChurchId = viewingChurch?.id ?? churchId ?? user?.churchId ?? null;
    const { canEditAssets } = usePermissions();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
    const [maintenanceAsset, setMaintenanceAsset] = useState<Asset | null>(null);

    // Estado do Drive da Igreja (Local + Google Drive Institucional)
    const [driveEmail, setDriveEmail] = useState<string | null>(null);
    const [driveLoading, setDriveLoading] = useState(false);
    const [connectingDrive, setConnectingDrive] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState<{ done: number; total: number } | null>(null);

    // Visualizador de Foto do Patrimônio
    const [previewPhoto, setPreviewPhoto] = useState<{
        url: string;
        name: string;
        category?: string;
        location?: string;
        value?: number;
    } | null>(null);
    const [previewZoom, setPreviewZoom] = useState(1);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState<AssetStatus>('ativo');
    const [value, setValue] = useState('');
    const [location, setLocation] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [acquisitionDate, setAcquisitionDate] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const photoInputRef = useRef<HTMLInputElement>(null);

    const [source, setSource] = useState<AssetSource>('compra');
    const [donorName, setDonorName] = useState('');
    const [donationDate, setDonationDate] = useState('');
    const [documentRef, setDocumentRef] = useState('');

    const [depreciationEnabled, setDepreciationEnabled] = useState(false);
    const [usefulLifeYears, setUsefulLifeYears] = useState('');
    const [depreciationRate, setDepreciationRate] = useState('');
    const [residualValue, setResidualValue] = useState('');
    const [depreciationStartDate, setDepreciationStartDate] = useState('');

    const [maintenanceIntervalMonths, setMaintenanceIntervalMonths] = useState('');
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');
    const [openMaintenanceAfterSave, setOpenMaintenanceAfterSave] = useState(false);

    // Verifica Google Drive da Igreja
    useEffect(() => {
        if (!effectiveChurchId) return;
        let active = true;
        setDriveLoading(true);
        googleDriveService
            .getStatus(effectiveChurchId)
            .then((st) => {
                if (active) setDriveEmail(st.email);
            })
            .catch(() => {
                if (active) setDriveEmail(null);
            })
            .finally(() => {
                if (active) setDriveLoading(false);
            });
        return () => {
            active = false;
        };
    }, [effectiveChurchId]);

    const handleConnectGoogleDrive = async () => {
        if (!effectiveChurchId) {
            toast.error('Igreja não identificada para conectar o Google Drive.');
            return;
        }
        setConnectingDrive(true);
        try {
            await googleDriveService.beginConnection(effectiveChurchId, window.location.pathname);
        } catch (err: any) {
            setConnectingDrive(false);
            toast.error(err?.message || 'Não foi possível iniciar a conexão com o Google Drive da igreja.');
        }
    };

    // Retorno do fluxo OAuth do Google (?googleDrive=connected|error)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const result = params.get('googleDrive');
        if (!result) return;
        if (result === 'connected') {
            toast.success('Google Drive da igreja conectado! As fotos do patrimônio serão salvas nele.');
            if (effectiveChurchId) {
                googleDriveService.getStatus(effectiveChurchId).then((st) => setDriveEmail(st.email)).catch(() => {});
            }
        } else {
            toast.error(params.get('message') || 'Não foi possível conectar o Google Drive.');
        }
        params.delete('googleDrive');
        params.delete('message');
        const query = params.toString();
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }, [effectiveChurchId]);

    /** Envia uma foto ao Google Drive da igreja e devolve o identificador `gdrive:<id>`. */
    const uploadPhotoToDrive = async (file: File | Blob, assetName: string): Promise<string> => {
        if (!effectiveChurchId) throw new Error('Igreja não identificada.');
        const safeName = (assetName || 'patrimonio')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .slice(0, 60);
        const type = file.type || 'image/jpeg';
        const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
        const named = new File([file], `patrimonio_${safeName}_${Date.now()}.${ext}`, { type });
        return googleDriveService.upload(effectiveChurchId, named);
    };

    const deleteDrivePhoto = (url?: string | null) => {
        if (!url || !effectiveChurchId || !googleDriveService.isDriveReceipt(url)) return;
        googleDriveService.deleteFile(effectiveChurchId, url).catch(() => {
            // arquivo pode já ter sido removido manualmente no Drive
        });
    };

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['assets', effectiveChurchId],
        queryFn: () => assetsService.getAssets(effectiveChurchId),
    });

    const createMutation = useMutation({
        mutationFn: assetsService.createAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Patrimônio cadastrado com sucesso no Drive da Igreja!');
            setIsModalOpen(false);
            resetForm();
        },
        onError: (error) => toast.error('Erro ao cadastrar patrimônio: ' + error.message),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; asset: Partial<Asset> & { churchId?: string | null } }) =>
            assetsService.updateAsset(data.id, data.asset),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Patrimônio atualizado com sucesso!');
            setIsModalOpen(false);
            resetForm();
        },
        onError: (error) => toast.error('Erro ao atualizar patrimônio: ' + error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: assetsService.deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Patrimônio removido com sucesso!');
        },
        onError: (error) => toast.error('Erro ao remover patrimônio: ' + error.message),
    });

    // Categorias únicas existentes
    const categoriesList = useMemo(() => {
        const set = new Set<string>(SUGGESTED_CATEGORIES);
        assets.forEach((a) => {
            if (a.category?.trim()) set.add(a.category.trim());
        });
        return Array.from(set);
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (categoryFilter !== 'all' && (a.category || '') !== categoryFilter) return false;
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchName = a.name.toLowerCase().includes(q);
                const matchCat = a.category?.toLowerCase().includes(q);
                const matchLoc = a.location?.toLowerCase().includes(q);
                const matchSerial = a.serialNumber?.toLowerCase().includes(q);
                const matchQr = a.qrCode?.toLowerCase().includes(q);
                if (!matchName && !matchCat && !matchLoc && !matchSerial && !matchQr) return false;
            }
            return true;
        });
    }, [assets, statusFilter, categoryFilter, searchTerm]);

    // Indicadores Executivos (KPIs)
    const stats = useMemo(() => {
        const totalCount = assets.length;
        const totalValue = assets.reduce((acc, a) => acc + (a.value || 0), 0);
        const activeCount = assets.filter((a) => a.status === 'ativo').length;
        const maintenanceCount = assets.filter((a) => a.status === 'em_manutencao').length;
        const withPhotoCount = assets.filter((a) => !!a.photoUrl).length;
        return { totalCount, totalValue, activeCount, maintenanceCount, withPhotoCount };
    }, [assets]);

    const resetForm = () => {
        setEditingAsset(null);
        setName('');
        setDescription('');
        setCategory('');
        setStatus('ativo');
        setValue('');
        setLocation('');
        setSerialNumber('');
        setAcquisitionDate('');
        setPhotoUrl('');
        setPhotoPreviewUrl('');
        setPhotoFile(null);
        setQrCode('');
        setSource('compra');
        setDonorName('');
        setDonationDate('');
        setDocumentRef('');
        setDepreciationEnabled(false);
        setUsefulLifeYears('');
        setDepreciationRate('');
        setResidualValue('');
        setDepreciationStartDate('');
        setMaintenanceIntervalMonths('');
        setNextMaintenanceDate('');
        setOpenMaintenanceAfterSave(false);
    };

    const openEdit = async (asset: Asset) => {
        setEditingAsset(asset);
        setName(asset.name);
        setCategory(asset.category || '');
        setStatus(asset.status);
        setValue(asset.value ? Math.round(asset.value * 100).toString() : '');
        setLocation(asset.location || '');
        setDescription(asset.description || '');
        setSerialNumber(asset.serialNumber || '');
        setAcquisitionDate(asset.acquisitionDate || '');
        setPhotoUrl(asset.photoUrl || '');
        setPhotoPreviewUrl(asset.photoUrl || '');
        setPhotoFile(null);
        setQrCode(asset.qrCode || '');

        setSource(asset.source || 'compra');
        setDonorName(asset.donorName || '');
        setDonationDate(asset.donationDate || '');
        setDocumentRef(asset.documentRef || '');

        setDepreciationEnabled(!!asset.depreciationEnabled);
        setUsefulLifeYears(
            asset.usefulLifeYears !== undefined && asset.usefulLifeYears !== null
                ? String(asset.usefulLifeYears)
                : ''
        );
        setDepreciationRate(
            asset.depreciationRate !== undefined && asset.depreciationRate !== null
                ? String(asset.depreciationRate)
                : ''
        );
        setResidualValue(
            asset.residualValue !== undefined && asset.residualValue !== null
                ? Math.round(asset.residualValue * 100).toString()
                : ''
        );
        setDepreciationStartDate(asset.depreciationStartDate || asset.acquisitionDate || '');

        setMaintenanceIntervalMonths(
            asset.maintenanceIntervalMonths !== undefined && asset.maintenanceIntervalMonths !== null
                ? String(asset.maintenanceIntervalMonths)
                : ''
        );
        setNextMaintenanceDate(asset.nextMaintenanceDate || '');
        setOpenMaintenanceAfterSave(false);
        setIsModalOpen(true);

        if (asset.photoUrl && googleDriveService.isDriveReceipt(asset.photoUrl)) {
            setPhotoPreviewUrl('');
            try {
                setPhotoPreviewUrl(await resolveAssetPhotoUrl(effectiveChurchId, asset.photoUrl));
            } catch {
                // ignora falha de preview remoto
            }
        }
    };

    // Seleção e compressão da foto (o envio ao Google Drive da igreja acontece ao salvar)
    const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingPhoto(true);
            const optimized = await compressImageFile(file, {
                maxWidth: 1280,
                maxHeight: 1280,
                quality: 0.8,
            });
            if (optimized.size > 5 * 1024 * 1024) {
                throw new Error('A foto ficou maior que 5 MB mesmo após a otimização. Escolha outra imagem.');
            }
            const dataUrl = await fileToDataUrl(optimized);
            setPhotoPreviewUrl(dataUrl);
            setPhotoFile(optimized instanceof File ? optimized : new File([optimized], file.name, { type: optimized.type || file.type }));
            if (!driveEmail) {
                toast.warning('Conecte o Google Drive da igreja para que a foto possa ser salva.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Não foi possível processar a imagem.');
        } finally {
            setUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    const handleOpenPhotoViewer = async (asset: Asset) => {
        if (!asset.photoUrl) return;
        let resolvedUrl: string;
        try {
            resolvedUrl = await resolveAssetPhotoUrl(effectiveChurchId, asset.photoUrl);
        } catch (err: any) {
            toast.error(err?.message || 'Não foi possível carregar a foto do Google Drive.');
            return;
        }
        setPreviewZoom(1);
        setPreviewPhoto({
            url: resolvedUrl,
            name: asset.name,
            category: asset.category,
            location: asset.location,
            value: asset.value,
        });
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('O nome do bem é obrigatório.');
            return;
        }

        const previousPhoto = editingAsset?.photoUrl;
        let finalPhotoUrl: string | null = photoUrl || null;

        // Foto nova: envia ao Google Drive da igreja e grava apenas o identificador no cadastro
        if (photoFile) {
            if (!driveEmail) {
                toast.error('Conecte o Google Drive da igreja para salvar a foto do patrimônio.');
                return;
            }
            try {
                setUploadingPhoto(true);
                finalPhotoUrl = await uploadPhotoToDrive(photoFile, name);
            } catch (err: any) {
                toast.error(err?.message || 'Não foi possível enviar a foto ao Google Drive da igreja.');
                return;
            } finally {
                setUploadingPhoto(false);
            }
        }

        const payload: Partial<Asset> & { churchId?: string | null } = {
            churchId: effectiveChurchId,
            name,
            description: description || undefined,
            category,
            status,
            location,
            value: value ? parseFloat(value) / 100 : undefined,
            serialNumber: serialNumber || undefined,
            acquisitionDate: acquisitionDate || undefined,
            photoUrl: finalPhotoUrl as any,
            qrCode: qrCode || undefined,

            source: source || undefined,
            donorName: source === 'doacao' ? donorName || undefined : undefined,
            donationDate: source === 'doacao' ? donationDate || undefined : undefined,
            documentRef: documentRef || undefined,

            depreciationEnabled,
            depreciationMethod: depreciationEnabled ? 'linear' : undefined,
            depreciationStartDate: depreciationEnabled
                ? depreciationStartDate || acquisitionDate || undefined
                : undefined,
            usefulLifeYears:
                depreciationEnabled && usefulLifeYears ? parseInt(usefulLifeYears, 10) : undefined,
            depreciationRate:
                depreciationEnabled && depreciationRate ? parseFloat(depreciationRate) : undefined,
            residualValue:
                depreciationEnabled && residualValue ? parseFloat(residualValue) / 100 : undefined,

            maintenanceIntervalMonths: maintenanceIntervalMonths
                ? parseInt(maintenanceIntervalMonths, 10)
                : undefined,
            nextMaintenanceDate: nextMaintenanceDate || undefined,
        };

        // Remove do Drive a foto antiga quando ela foi trocada ou removida
        const cleanupOldPhoto = () => {
            if (previousPhoto && previousPhoto !== finalPhotoUrl) deleteDrivePhoto(previousPhoto);
        };

        if (editingAsset) {
            updateMutation.mutate(
                { id: editingAsset.id, asset: payload },
                {
                    onSuccess: () => {
                        cleanupOldPhoto();
                        if (openMaintenanceAfterSave) {
                            setMaintenanceAsset(editingAsset);
                            setIsMaintenanceOpen(true);
                        }
                    },
                    onError: () => {
                        // Cadastro não foi salvo: descarta a foto recém-enviada para não deixar arquivo órfão
                        if (photoFile && finalPhotoUrl) deleteDrivePhoto(finalPhotoUrl);
                    },
                } as any
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: (created) => {
                    if (openMaintenanceAfterSave) {
                        setMaintenanceAsset(created);
                        setIsMaintenanceOpen(true);
                    }
                },
                onError: () => {
                    if (photoFile && finalPhotoUrl) deleteDrivePhoto(finalPhotoUrl);
                },
            });
        }
    };

    const computeDepreciationPreview = () => {
        const initial = value ? parseFloat(value) / 100 : undefined;
        if (!depreciationEnabled || !initial || Number.isNaN(initial)) return null;
        const start =
            depreciationStartDate || acquisitionDate
                ? new Date(depreciationStartDate || acquisitionDate)
                : null;
        if (!start || Number.isNaN(start.getTime())) return null;
        const now = new Date();
        const years = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const residual = residualValue ? parseFloat(residualValue) / 100 : 0;
        const rate = depreciationRate ? parseFloat(depreciationRate) / 100 : null;
        const life = usefulLifeYears ? parseFloat(usefulLifeYears) : null;

        let depreciated: number | null = null;
        if (rate !== null && !Number.isNaN(rate) && rate > 0) {
            depreciated = initial * Math.pow(1 - rate, years);
        } else if (life !== null && !Number.isNaN(life) && life > 0) {
            const annual = (initial - residual) / life;
            depreciated = initial - annual * years;
        }
        if (depreciated === null || Number.isNaN(depreciated)) return null;
        const floored = Math.max(residual, depreciated);
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floored);
    };

    const getStatusBadge = (st: AssetStatus) => {
        switch (st) {
            case 'ativo':
                return (
                    <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
                    >
                        Operacional (Ativo)
                    </Badge>
                );
            case 'em_manutencao':
                return (
                    <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                    >
                        Em Manutenção
                    </Badge>
                );
            case 'inativo':
                return (
                    <Badge
                        variant="outline"
                        className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 font-semibold"
                    >
                        Inativo / Baixado
                    </Badge>
                );
            default:
                return <Badge variant="outline">{st}</Badge>;
        }
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="p-4 md:p-8 md:pt-4 max-w-7xl mx-auto space-y-6">
            {/* Cabeçalho Executivo */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-card via-card to-primary/5 p-6 rounded-2xl border border-border/80 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Package className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                                    Gestão Patrimonial
                                </h1>
                                <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold uppercase">
                                    Controle de Ativos
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Inventário completo de equipamentos, mobiliário, veículos, imóveis e fotos no Drive da Igreja.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    <ExcelAdministrativeDashboardButton />
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="gap-2 font-bold shadow-md rounded-xl h-10 px-5"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Bem Patrimonial
                    </Button>
                </div>
            </div>

            {/* Barra de Armazenamento de Fotos — Google Drive da Igreja */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-bold text-foreground">
                                Armazenamento das Fotos do Patrimônio
                            </h2>
                            {driveEmail ? (
                                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" /> Google Drive Conectado: {driveEmail}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="w-3 h-3" /> Google Drive Desconectado
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {driveEmail
                                ? 'As fotos são salvas de forma segura e privada diretamente no Google Drive desta igreja.'
                                : 'Conecte o Google Drive institucional para salvar as fotos dos bens com segurança e sem ocupar o servidor.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!driveEmail ? (
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleConnectGoogleDrive}
                            disabled={driveLoading || connectingDrive}
                            className="text-xs gap-1.5 rounded-xl h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                            {connectingDrive ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <HardDrive className="w-3.5 h-3.5" />
                            )}
                            Conectar Google Drive da Igreja
                        </Button>
                    ) : (
                        <Badge variant="secondary" className="text-xs px-3 py-1">
                            Fotos protegidas no Drive
                        </Badge>
                    )}
                </div>
            </div>

            {/* Cards de KPIs Executivos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-border/80 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Total de Bens
                        </CardDescription>
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Package className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.totalCount} itens</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.withPhotoCount} com foto arquivada no Drive
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 shadow-sm bg-emerald-500/[0.03]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Valor Patrimonial Total
                        </CardDescription>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(stats.totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Soma estimada dos ativos cadastrados
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Bens Operacionais
                        </CardDescription>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-foreground">{stats.activeCount} ativos</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.totalCount > 0
                                ? `${Math.round((stats.activeCount / stats.totalCount) * 100)}% em operação normal`
                                : 'Nenhum ativo registrado'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 shadow-sm bg-amber-500/[0.03]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Em Manutenção
                        </CardDescription>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                            <Wrench className="w-4 h-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {stats.maintenanceCount} bens
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Acompanhamento preventivo e corretivo
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros, Categorias e Alternância de Visão */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Buscar por nome, série, QR code, setor ou categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 rounded-xl"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="ativo">Operacional (Ativo)</option>
                        <option value="em_manutencao">Em Manutenção</option>
                        <option value="inativo">Inativo / Baixado</option>
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
                    >
                        <option value="all">Todas as Categorias</option>
                        {categoriesList.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/60 self-end md:self-auto">
                    <Button
                        type="button"
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                    >
                        <List className="w-3.5 h-3.5" />
                        Tabela
                    </Button>
                    <Button
                        type="button"
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Galeria de Fotos
                    </Button>
                </div>
            </div>

            {/* Listagem de Patrimônios */}
            {isLoading ? (
                <div className="text-center py-14 text-muted-foreground flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span>Carregando inventário patrimonial...</span>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="text-center py-14 bg-card rounded-2xl border border-dashed border-border space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Package className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Nenhum bem patrimonial encontrado</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                            Cadastre equipamentos de som, instrumentos, computadores, móveis ou imóveis com foto salva diretamente no Drive Local da Igreja.
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="gap-2 rounded-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Cadastrar Primeiro Bem
                    </Button>
                </div>
            ) : viewMode === 'grid' ? (
                /* VISÃO EM GALERIA DE CARDS COM FOTO DO PATRIMÔNIO */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredAssets.map((asset) => (
                        <Card
                            key={asset.id}
                            className="rounded-2xl border-border/80 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between"
                        >
                            <div>
                                {/* Thumbnail da Foto do Patrimônio */}
                                <div
                                    onClick={() =>
                                        asset.photoUrl ? handleOpenPhotoViewer(asset) : openEdit(asset)
                                    }
                                    className="h-44 bg-muted/50 relative cursor-pointer overflow-hidden flex items-center justify-center border-b border-border"
                                >
                                    <AssetPhoto
                                        churchId={effectiveChurchId}
                                        photoUrl={asset.photoUrl}
                                        alt={asset.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        iconClassName="w-8 h-8"
                                        emptyLabel="Adicionar foto do bem"
                                    />

                                    <div className="absolute top-2.5 left-2.5">
                                        {getStatusBadge(asset.status)}
                                    </div>

                                    {asset.photoUrl && (
                                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> Ampliar Foto
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-4 space-y-2.5">
                                    <div>
                                        <h3 className="font-bold text-base text-foreground line-clamp-1">
                                            {asset.name}
                                        </h3>
                                        {asset.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                {asset.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {asset.category && (
                                            <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                                                <Tag className="w-3 h-3" /> {asset.category}
                                            </Badge>
                                        )}
                                        {asset.location && (
                                            <Badge variant="outline" className="text-[10px] gap-1 font-medium">
                                                <MapPin className="w-3 h-3" /> {asset.location}
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </div>

                            <div className="px-4 pb-4 pt-2 border-t border-border/50 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                        Valor Estimado
                                    </span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(asset.value)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Editar Bem"
                                        onClick={() => openEdit(asset)}
                                    >
                                        <Pencil className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Manutenções"
                                        onClick={() => {
                                            setMaintenanceAsset(asset);
                                            setIsMaintenanceOpen(true);
                                        }}
                                    >
                                        <Wrench className="w-4 h-4 text-orange-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Excluir"
                                        onClick={() => {
                                            if (window.confirm(`Deseja realmente excluir "${asset.name}"?`)) {
                                                deleteDrivePhoto(asset.photoUrl);
                                                deleteMutation.mutate(asset.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* VISÃO EM TABELA EXECUTIVA COM MINIATURA DA FOTO */
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead className="w-[72px]">Foto</TableHead>
                                    <TableHead>Identificação do Bem</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Localização / Setor</TableHead>
                                    <TableHead>Valor Estimado</TableHead>
                                    <TableHead>Situação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssets.map((asset) => (
                                    <TableRow key={asset.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    asset.photoUrl ? handleOpenPhotoViewer(asset) : openEdit(asset)
                                                }
                                                title={
                                                    asset.photoUrl
                                                        ? 'Clique para ampliar a foto do patrimônio'
                                                        : 'Clique para adicionar foto'
                                                }
                                                className="w-12 h-12 rounded-xl border border-border bg-muted/50 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all group relative"
                                            >
                                                <AssetPhoto
                                                    churchId={effectiveChurchId}
                                                    photoUrl={asset.photoUrl}
                                                    alt={asset.name}
                                                    className="w-full h-full object-cover"
                                                    iconClassName="w-5 h-5 text-muted-foreground/60 group-hover:text-primary transition-colors"
                                                />
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-foreground">{asset.name}</div>
                                            {asset.description && (
                                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                                    {asset.description}
                                                </div>
                                            )}
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                                {asset.serialNumber && <span>Série: {asset.serialNumber}</span>}
                                                {asset.qrCode && <span>Tombamento/QR: {asset.qrCode}</span>}
                                                {asset.createdAt && (
                                                    <span>
                                                        Reg: {format(new Date(asset.createdAt), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                                {asset.nextMaintenanceDate && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        Próx. manutenção:{' '}
                                                        {format(new Date(asset.nextMaintenanceDate), 'dd/MM/yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {asset.category ? (
                                                <Badge variant="secondary" className="font-medium">
                                                    {asset.category}
                                                </Badge>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>{asset.location || '-'}</TableCell>
                                        <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(asset.value)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {asset.photoUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Ver Foto do Patrimônio"
                                                        onClick={() => handleOpenPhotoViewer(asset)}
                                                    >
                                                        <Eye className="w-4 h-4 text-emerald-600" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Editar"
                                                    onClick={() => openEdit(asset)}
                                                >
                                                    <Pencil className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Manutenções"
                                                    onClick={() => {
                                                        setMaintenanceAsset(asset);
                                                        setIsMaintenanceOpen(true);
                                                    }}
                                                >
                                                    <Wrench className="w-4 h-4 text-orange-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Excluir"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Deseja realmente excluir "${asset.name}"?`
                                                            )
                                                        ) {
                                                            deleteDrivePhoto(asset.photoUrl);
                                                            deleteMutation.mutate(asset.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Modal Profissional — Cadastrar / Editar Bem Patrimonial */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                    <DialogHeader>
                        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black">
                                        {editingAsset ? 'Editar Bem Patrimonial' : 'Cadastrar Novo Bem'}
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Ficha técnica patrimonial com foto vinculada ao Drive Local da Igreja
                                    </p>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-6 pb-4 flex-1 overflow-hidden flex flex-col">
                        <Tabs defaultValue="basico" className="w-full flex-1 flex flex-col overflow-hidden">
                            <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto gap-1.5 p-1.5 bg-muted/60 rounded-xl scrollbar-hide snap-x">
                                <TabsTrigger value="basico" className="shrink-0 snap-start gap-1.5 rounded-lg font-bold">
                                    <Camera className="w-3.5 h-3.5" />
                                    Básico & Foto
                                </TabsTrigger>
                                <TabsTrigger value="financeiro" className="shrink-0 snap-start gap-1.5 rounded-lg font-bold">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Financeiro
                                </TabsTrigger>
                                <TabsTrigger value="manutencao" className="shrink-0 snap-start gap-1.5 rounded-lg font-bold">
                                    <Wrench className="w-3.5 h-3.5" />
                                    Manutenção
                                </TabsTrigger>
                                <TabsTrigger value="avancado" className="shrink-0 snap-start gap-1.5 rounded-lg font-bold">
                                    <QrCode className="w-3.5 h-3.5" />
                                    Tombamento & Origem
                                </TabsTrigger>
                            </TabsList>
                            <Separator className="mt-3" />

                            <div className="flex-1 overflow-y-auto max-h-[calc(92vh-230px)] pr-1 mt-4">
                                <TabsContent value="basico" className="mt-0 space-y-5">
                                    {/* Card de Foto do Patrimônio (Drive Local da Igreja) */}
                                    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-4 flex flex-col sm:flex-row items-center gap-4">
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handlePhotoFileChange}
                                        />

                                        <div
                                            onClick={() => photoInputRef.current?.click()}
                                            className="w-28 h-28 rounded-2xl border-2 border-primary/30 bg-background overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all shrink-0 relative group shadow-sm"
                                        >
                                            {uploadingPhoto ? (
                                                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                            ) : photoPreviewUrl ? (
                                                <>
                                                    <img
                                                        src={photoPreviewUrl}
                                                        alt="Foto do Patrimônio"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                                                        <Camera className="w-5 h-5" />
                                                        Trocar Foto
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-primary p-2 text-center">
                                                    <div className="p-2.5 rounded-full bg-primary/10 mb-1.5">
                                                        <Camera className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <span className="text-[11px] font-bold leading-tight">
                                                        Foto do Bem
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-2 text-center sm:text-left">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                                    <ImageIcon className="w-4 h-4 text-primary" />
                                                    Fotografia de Identificação do Patrimônio
                                                </h4>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] border-cyan-500/40 text-cyan-600 dark:text-cyan-400 gap-1"
                                                >
                                                    <HardDrive className="w-3 h-3" /> {driveEmail ? 'Google Drive Conectado' : 'Google Drive Necessário'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Tire uma foto com a câmera ou selecione uma imagem do computador. A foto é comprimida e arquivada com segurança no Google Drive da igreja.
                                            </p>
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => photoInputRef.current?.click()}
                                                    disabled={uploadingPhoto}
                                                    className="h-8 text-xs gap-1.5 rounded-xl font-bold"
                                                >
                                                    <Camera className="w-3.5 h-3.5" />
                                                    {photoPreviewUrl ? 'Alterar Foto do Patrimônio' : 'Selecionar / Tirar Foto'}
                                                </Button>
                                                {photoPreviewUrl && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setPhotoUrl('');
                                                            setPhotoPreviewUrl('');
                                                            setPhotoFile(null);
                                                        }}
                                                        className="h-8 text-xs text-destructive hover:text-destructive gap-1 rounded-xl"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Remover Foto
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold">Nome do Bem *</label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Ex: Mesa de Som Digital Behringer X32, Veículo Van Ducato, Projetor Epson..."
                                                className="rounded-xl"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold">Descrição / Estado de Conservação</label>
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Detalhes técnicos, estado de conservação, acessórios inclusos, responsável pelo setor..."
                                                className="min-h-[85px] rounded-xl"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Categoria</label>
                                                <Input
                                                    list="asset-categories-datalist"
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    placeholder="Ex: Som e Áudio, Instrumentos, Imóveis"
                                                    className="rounded-xl"
                                                />
                                                <datalist id="asset-categories-datalist">
                                                    {SUGGESTED_CATEGORIES.map((c) => (
                                                        <option key={c} value={c} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Localização / Setor</label>
                                                <Input
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="Ex: Templo Principal, Sala Infantil, Secretaria"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Situação Operacional</label>
                                                <select
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value as AssetStatus)}
                                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <option value="ativo">Operacional (Ativo)</option>
                                                    <option value="em_manutencao">Em Manutenção</option>
                                                    <option value="inativo">Inativo / Baixado</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Data de Aquisição</label>
                                                <Input
                                                    type="date"
                                                    value={acquisitionDate}
                                                    onChange={(e) => setAcquisitionDate(e.target.value)}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="financeiro" className="mt-0">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Valor Estimado / Aquisição</label>
                                                <Input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={value ? formatCurrencyInput(value) : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                        setValue(rawValue);
                                                    }}
                                                    placeholder="R$ 0,00"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Documento / Nota Fiscal / Ref.</label>
                                                <Input
                                                    value={documentRef}
                                                    onChange={(e) => setDocumentRef(e.target.value)}
                                                    placeholder="Ex: NF 1234, Termo de Doação..."
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold">Cálculo de Depreciação Contábil</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Ative para acompanhar automaticamente a desvalorização anual do equipamento ou veículo.
                                                </p>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm font-semibold shrink-0 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={depreciationEnabled}
                                                    onChange={(e) => setDepreciationEnabled(e.target.checked)}
                                                />
                                                Ativar
                                            </label>
                                        </div>

                                        {depreciationEnabled && (
                                            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Início da Depreciação</label>
                                                        <Input
                                                            type="date"
                                                            value={depreciationStartDate}
                                                            onChange={(e) => setDepreciationStartDate(e.target.value)}
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Se vazio, usa a data de aquisição.
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Valor Residual</label>
                                                        <Input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={residualValue ? formatCurrencyInput(residualValue) : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/[^\d]/g, '');
                                                                setResidualValue(rawValue);
                                                            }}
                                                            placeholder="R$ 0,00"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Vida útil (anos)</label>
                                                        <Input
                                                            type="number"
                                                            value={usefulLifeYears}
                                                            onChange={(e) => setUsefulLifeYears(e.target.value)}
                                                            placeholder="Ex: 5"
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Opção A (linear por vida útil).
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Taxa (% ao ano)</label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={depreciationRate}
                                                            onChange={(e) => setDepreciationRate(e.target.value)}
                                                            placeholder="Ex: 10"
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Opção B (percentual ao ano).
                                                        </p>
                                                    </div>
                                                </div>

                                                {computeDepreciationPreview() && (
                                                    <div className="text-xs bg-background border border-border rounded-xl p-3">
                                                        <span className="font-bold">Valor líquido contábil hoje:</span>{' '}
                                                        {computeDepreciationPreview()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="manutencao" className="mt-0">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Intervalo de Revisão (meses)</label>
                                                <Input
                                                    type="number"
                                                    value={maintenanceIntervalMonths}
                                                    onChange={(e) => setMaintenanceIntervalMonths(e.target.value)}
                                                    placeholder="Ex: 6"
                                                    className="rounded-xl"
                                                />
                                                <p className="text-[11px] text-muted-foreground">
                                                    Para alerta de manutenção preventiva periódica.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Data da Próxima Manutenção</label>
                                                <Input
                                                    type="date"
                                                    value={nextMaintenanceDate}
                                                    onChange={(e) => setNextMaintenanceDate(e.target.value)}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 text-sm font-medium p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={openMaintenanceAfterSave}
                                                onChange={(e) => setOpenMaintenanceAfterSave(e.target.checked)}
                                            />
                                            Após salvar, abrir histórico e ordem de serviço de manutenção
                                        </label>
                                    </div>
                                </TabsContent>

                                <TabsContent value="avancado" className="mt-0">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Número de Série</label>
                                                <Input
                                                    value={serialNumber}
                                                    onChange={(e) => setSerialNumber(e.target.value)}
                                                    placeholder="Ex: SN-9845120"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Código de Tombamento / Plaqueta QR</label>
                                                <Input
                                                    value={qrCode}
                                                    onChange={(e) => setQrCode(e.target.value)}
                                                    placeholder="Ex: PAT-000125"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Origem da Aquisição</label>
                                                <select
                                                    value={source}
                                                    onChange={(e) => setSource(e.target.value as AssetSource)}
                                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    <option value="compra">Compra Direta</option>
                                                    <option value="doacao">Doação Recebida</option>
                                                    <option value="comodato">Comodato / Empréstimo</option>
                                                    <option value="outro">Outro</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold">Link Externo da Foto (opcional)</label>
                                                <Input
                                                    value={photoUrl.startsWith('data:') ? '' : photoUrl}
                                                    onChange={(e) => {
                                                        setPhotoUrl(e.target.value);
                                                        setPhotoPreviewUrl(e.target.value);
                                                    }}
                                                    placeholder="https://... (ou use o botão de foto na aba Básico)"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {source === 'doacao' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold">Nome do Doador</label>
                                                    <Input
                                                        value={donorName}
                                                        onChange={(e) => setDonorName(e.target.value)}
                                                        placeholder="Nome do membro ou instituição doadora"
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold">Data da Doação</label>
                                                    <Input
                                                        type="date"
                                                        value={donationDate}
                                                        onChange={(e) => setDonationDate(e.target.value)}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <div className="px-6 py-4 border-t bg-background/80 backdrop-blur flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={createMutation.isPending || updateMutation.isPending || uploadingPhoto}
                            className="rounded-xl font-bold px-6"
                        >
                            {editingAsset ? 'Atualizar Patrimônio' : 'Salvar Cadastro'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Visualizador de Foto do Patrimônio em Tela Cheia com Zoom */}
            <Dialog
                open={!!previewPhoto}
                onOpenChange={(open) => {
                    if (!open) {
                        if (previewPhoto?.url.startsWith('blob:')) {
                            URL.revokeObjectURL(previewPhoto.url);
                        }
                        setPreviewPhoto(null);
                        setPreviewZoom(1);
                    }
                }}
            >
                <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden">
                    <DialogHeader className="pb-3 border-b border-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                            <div>
                                <DialogTitle className="text-lg font-black flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary" />
                                    {previewPhoto?.name}
                                </DialogTitle>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                    {previewPhoto?.category && <span>Categoria: {previewPhoto.category}</span>}
                                    {previewPhoto?.location && <span>• Local: {previewPhoto.location}</span>}
                                    {previewPhoto?.value !== undefined && (
                                        <span className="text-emerald-600 font-bold">
                                            • {formatCurrency(previewPhoto.value)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {previewPhoto?.url && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() =>
                                                setPreviewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))
                                            }
                                        >
                                            <ZoomOut className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-[11px] font-mono px-1 font-semibold min-w-[42px] text-center">
                                            {Math.round(previewZoom * 100)}%
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() =>
                                                setPreviewZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))
                                            }
                                        >
                                            <ZoomIn className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <Button asChild size="sm" className="h-8 text-xs gap-1.5 rounded-lg">
                                        <a
                                            href={previewPhoto.url}
                                            download={`patrimonio-${previewPhoto.name}.jpg`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="h-3.5 w-3.5" /> Baixar Foto
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20 rounded-xl border border-border/50 min-h-[380px]">
                        {previewPhoto?.url && (
                            <div
                                className="transition-transform duration-200 flex items-center justify-center"
                                style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center' }}
                            >
                                <img
                                    src={previewPhoto.url}
                                    alt={previewPhoto.name}
                                    className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-xl"
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal - Histórico de Manutenção */}
            <AssetMaintenanceModal
                asset={maintenanceAsset}
                open={isMaintenanceOpen}
                onOpenChange={setIsMaintenanceOpen}
            />
        </div>
    );
}
