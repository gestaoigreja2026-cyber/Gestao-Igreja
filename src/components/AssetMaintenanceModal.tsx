import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench, Plus, History } from 'lucide-react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { assetsService } from '@/services/assets.service';
import { Asset, AssetMaintenance, MaintenanceStatus } from '@/types';

interface AssetMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
}

export function AssetMaintenanceModal({ isOpen, onClose, asset }: AssetMaintenanceModalProps) {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    // Form states
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [cost, setCost] = useState('');
    const [responsible, setResponsible] = useState('');
    const [status, setStatus] = useState<MaintenanceStatus>('agendada');

    const { data: history = [], isLoading } = useQuery({
        queryKey: ['asset_maintenance', asset?.id],
        queryFn: () => assetsService.getMaintenanceHistory(asset!.id),
        enabled: !!asset?.id && isOpen,
    });

    const createMutation = useMutation({
        mutationFn: assetsService.createMaintenance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset_maintenance', asset?.id] });
            toast.success('Manutenção registrada com sucesso!');
            setIsAdding(false);
            resetForm();
        },
        onError: (error) => toast.error('Erro ao registrar manutenção: ' + error.message),
    });

    const resetForm = () => {
        setDescription('');
        setScheduledDate('');
        setCost('');
        setResponsible('');
        setStatus('agendada');
    };

    const handleSave = () => {
        if (!description.trim()) {
            toast.error('A descrição é obrigatória.');
            return;
        }
        if (!asset) return;

        createMutation.mutate({
            assetId: asset.id,
            description,
            scheduledDate: scheduledDate ? scheduledDate : undefined,
            cost: cost ? parseFloat(cost) : undefined,
            responsible,
            status,
        });
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getStatusColor = (st: MaintenanceStatus) => {
        switch (st) {
            case 'agendada': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'em_andamento': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'concluida': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const formatStatus = (st: MaintenanceStatus) => {
        return st.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setIsAdding(false);
                resetForm();
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wrench className="w-5 h-5 text-primary" />
                        Manutenções: {asset?.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
                    {/* Header Action */}
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2 text-foreground">
                            <History className="w-4 h-4 text-muted-foreground" />
                            Histórico de Manutenções
                        </h3>
                        {!isAdding && (
                            <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2">
                                <Plus className="w-4 h-4" /> Registrar Nova
                            </Button>
                        )}
                    </div>

                    {/* Add Form */}
                    {isAdding && (
                        <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4 animate-in fade-in slide-in-from-top-4">
                            <h4 className="font-medium text-sm text-primary">Novo Registro</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Descrição do Serviço *</label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ex: Troca de cabos, Limpeza geral..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Responsável / Empresa</label>
                                    <Input
                                        value={responsible}
                                        onChange={(e) => setResponsible(e.target.value)}
                                        placeholder="Ex: Assistência Técnica XYZ"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Custo Estimado/Real</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                        placeholder="R$ 0,00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Data (Opcional)</label>
                                    <Input
                                        type="date"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status da Manutenção</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="agendada">Agendada</option>
                                        <option value="em_andamento">Em Andamento</option>
                                        <option value="concluida">Concluída</option>
                                        <option value="cancelada">Cancelada</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                                    Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={createMutation.isPending}>
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* History Table */}
                    {isLoading ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">Carregando histórico...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed border-border">
                            <p className="text-muted-foreground text-sm">Nenhuma manutenção registrada para este item.</p>
                        </div>
                    ) : (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Custo</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="whitespace-nowrap text-sm">
                                                {record.scheduledDate
                                                    ? format(new Date(record.scheduledDate), 'dd/MM/yyyy')
                                                    : format(new Date(record.createdAt), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-sm">{record.description}</p>
                                                {record.responsible && (
                                                    <p className="text-xs text-muted-foreground">Resp: {record.responsible}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{formatCurrency(record.cost)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(record.status)}>
                                                    {formatStatus(record.status)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
