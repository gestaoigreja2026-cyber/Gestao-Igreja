import { useState, useEffect } from 'react';
import { UserPlus, Phone, Calendar, MessageSquare, CheckCircle, Clock, Search, Loader2, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { membersService } from '@/services/members.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { ExcelConsolidacaoReportButton } from '@/components/ExcelConsolidacaoReport';

interface NovoConvertido {
  id?: string;
  name: string;
  phone: string;
  visitDay: string;
  visitService: string;
  week1Contact: string;
  week1Date: string;
  week2InviteCell: string;
  week2Date: string;
  week3InviteCult: string;
  week3Date: string;
  week4HomeVisit: string;
  week4Date: string;
  baptismDate: string;
  observations: string;
  status: 'novo' | 'em_acompanhamento' | 'consolidado' | 'desistente';
  createdAt?: string;
}

export default function Consolidacao() {
  useDocumentTitle('Consolidação');
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const effectiveChurchId = churchId ?? user?.churchId;

  const [novosConvertidos, setNovosConvertidos] = useState<NovoConvertido[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<NovoConvertido>({
    name: '',
    phone: '',
    visitDay: '',
    visitService: '',
    week1Contact: '',
    week1Date: '',
    week2InviteCell: '',
    week2Date: '',
    week3InviteCult: '',
    week3Date: '',
    week4HomeVisit: '',
    week4Date: '',
    baptismDate: '',
    observations: '',
    status: 'novo',
  });

  useEffect(() => {
    loadNovosConvertidos();
  }, [effectiveChurchId]);

  async function loadNovosConvertidos() {
    if (!effectiveChurchId) return;
    try {
      setLoading(true);
      const data = await membersService.getAll(effectiveChurchId);
      // Filtra apenas membros com status de visitante (novos convertidos)
      const visitantes = (data || [])
        .filter((m: any) => m.status === 'visitante' || m.status === 'ativo')
        .map((m: any) => {
          // Tenta fazer parse dos dados de consolidação do notes
          let consolidacaoData: any = {};
          try {
            if (m.notes && m.notes.startsWith('{')) {
              consolidacaoData = JSON.parse(m.notes);
            }
          } catch (e) {
            // Se não for JSON, trata como observação simples
            consolidacaoData = { observations: m.notes || '' };
          }
          
          return {
            id: m.id,
            name: m.name || 'Sem Nome',
            phone: m.phone || '',
            visitDay: consolidacaoData.visitDay || '',
            visitService: consolidacaoData.visitService || '',
            week1Contact: consolidacaoData.week1Contact || '',
            week1Date: consolidacaoData.week1Date || '',
            week2InviteCell: consolidacaoData.week2InviteCell || '',
            week2Date: consolidacaoData.week2Date || '',
            week3InviteCult: consolidacaoData.week3InviteCult || '',
            week3Date: consolidacaoData.week3Date || '',
            week4HomeVisit: consolidacaoData.week4HomeVisit || '',
            week4Date: consolidacaoData.week4Date || '',
            baptismDate: consolidacaoData.baptismDate || '',
            observations: consolidacaoData.observations || (m.notes && !m.notes.startsWith('{') ? m.notes : ''),
            status: (m.status === 'visitante' ? 'novo' : 'consolidado') as NovoConvertido['status'],
            createdAt: m.created_at,
          };
        });
      setNovosConvertidos(visitantes as NovoConvertido[]);
    } catch (error) {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar a lista de novos convertidos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveChurchId) {
      toast({
        title: 'Erro',
        description: 'Nenhuma igreja vinculada.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Prepara dados de acompanhamento como JSON para salvar no notes
      const consolidacaoData = {
        visitDay: formData.visitDay,
        visitService: formData.visitService,
        week1Contact: formData.week1Contact,
        week1Date: formData.week1Date,
        week2InviteCell: formData.week2InviteCell,
        week2Date: formData.week2Date,
        week3InviteCult: formData.week3InviteCult,
        week3Date: formData.week3Date,
        week4HomeVisit: formData.week4HomeVisit,
        week4Date: formData.week4Date,
        baptismDate: formData.baptismDate,
        observations: formData.observations,
      };
      
      const notesJson = JSON.stringify(consolidacaoData);
      
      if (editingId) {
        // Atualiza existente
        await membersService.update(editingId, {
          name: formData.name,
          phone: formData.phone,
          notes: notesJson,
        });
        toast({ title: 'Atualizado!', description: 'Dados do acompanhamento atualizados com sucesso.' });
      } else {
        // Cria novo
        await membersService.create({
          name: formData.name,
          phone: formData.phone || null,
          status: 'visitante',
          notes: notesJson,
        }, effectiveChurchId);
        toast({ title: 'Salvo!', description: 'Novo convertido registrado com sucesso.' });
      }

      resetForm();
      loadNovosConvertidos();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await membersService.delete(deleteId);
      toast({ title: 'Excluído!', description: 'Registro removido com sucesso.' });
      loadNovosConvertidos();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      visitDay: '',
      visitService: '',
      week1Contact: '',
      week1Date: '',
      week2InviteCell: '',
      week2Date: '',
      week3InviteCult: '',
      week3Date: '',
      week4HomeVisit: '',
      week4Date: '',
      baptismDate: '',
      observations: '',
      status: 'novo',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (convertido: NovoConvertido) => {
    setFormData({
      name: convertido.name,
      phone: convertido.phone,
      visitDay: convertido.visitDay || '',
      visitService: convertido.visitService || '',
      week1Contact: convertido.week1Contact || '',
      week1Date: convertido.week1Date || '',
      week2InviteCell: convertido.week2InviteCell || '',
      week2Date: convertido.week2Date || '',
      week3InviteCult: convertido.week3InviteCult || '',
      week3Date: convertido.week3Date || '',
      week4HomeVisit: convertido.week4HomeVisit || '',
      week4Date: convertido.week4Date || '',
      baptismDate: convertido.baptismDate || '',
      observations: convertido.observations,
      status: convertido.status,
    });
    setEditingId(convertido.id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      novo: 'bg-blue-100 text-blue-700 border-blue-200',
      em_acompanhamento: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      consolidado: 'bg-green-100 text-green-700 border-green-200',
      desistente: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const labels = {
      novo: 'Novo',
      em_acompanhamento: 'Em Acompanhamento',
      consolidado: 'Consolidado',
      desistente: 'Desistente',
    };
    return (
      <Badge variant="outline" className={cn('font-medium', styles[status as keyof typeof styles] || styles.novo)}>
        {labels[status as keyof typeof labels] || 'Novo'}
      </Badge>
    );
  };

  const filteredConvertidos = novosConvertidos.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Consolidação</h1>
        <p className="text-muted-foreground">
          Acompanhamento de novos convertidos - 4 semanas de integração
        </p>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {editingId ? 'Editar Acompanhamento' : 'Novo Convertido'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Dados Básicos */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome do convertido"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              {/* Visita Inicial */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Visita Inicial
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitDay">Dia da Visita</Label>
                    <Input
                      id="visitDay"
                      value={formData.visitDay}
                      onChange={(e) => setFormData({ ...formData, visitDay: e.target.value })}
                      placeholder="Ex: Domingo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitService">Culto</Label>
                    <Input
                      id="visitService"
                      value={formData.visitService}
                      onChange={(e) => setFormData({ ...formData, visitService: e.target.value })}
                      placeholder="Ex: 19h"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week1Date">Data</Label>
                    <Input
                      id="week1Date"
                      type="date"
                      value={formData.week1Date}
                      onChange={(e) => setFormData({ ...formData, week1Date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 1ª Semana - Contato */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-blue-600 mb-3">1ª Semana - Contato Telefônico/Visita</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week1Contact">Contato Realizado</Label>
                    <Input
                      id="week1Contact"
                      value={formData.week1Contact}
                      onChange={(e) => setFormData({ ...formData, week1Contact: e.target.value })}
                      placeholder="Ex: Ligação realizada, oração com a família"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week1ContactDate">Data do Contato</Label>
                    <Input
                      id="week1ContactDate"
                      type="date"
                      value={formData.week1Date}
                      onChange={(e) => setFormData({ ...formData, week1Date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 2ª Semana - Convite Célula */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-green-600 mb-3">2ª Semana - Convite para Célula</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week2InviteCell">Convite Realizado</Label>
                    <Input
                      id="week2InviteCell"
                      value={formData.week2InviteCell}
                      onChange={(e) => setFormData({ ...formData, week2InviteCell: e.target.value })}
                      placeholder="Ex: Confirmou presença na célula da 3ª feira"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week2Date">Data do Convite</Label>
                    <Input
                      id="week2Date"
                      type="date"
                      value={formData.week2Date}
                      onChange={(e) => setFormData({ ...formData, week2Date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 3ª Semana - Convite Culto */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-purple-600 mb-3">3ª Semana - Convite para Culto</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week3InviteCult">Convite Realizado</Label>
                    <Input
                      id="week3InviteCult"
                      value={formData.week3InviteCult}
                      onChange={(e) => setFormData({ ...formData, week3InviteCult: e.target.value })}
                      placeholder="Ex: Compareceu ao culto de domingo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week3Date">Data</Label>
                    <Input
                      id="week3Date"
                      type="date"
                      value={formData.week3Date}
                      onChange={(e) => setFormData({ ...formData, week3Date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 4ª Semana - Visita no Lar */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-orange-600 mb-3">4ª Semana - Visita no Lar</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week4HomeVisit">Visita Realizada</Label>
                    <Input
                      id="week4HomeVisit"
                      value={formData.week4HomeVisit}
                      onChange={(e) => setFormData({ ...formData, week4HomeVisit: e.target.value })}
                      placeholder="Ex: Visita realizada, família receptiva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week4Date">Data da Visita</Label>
                    <Input
                      id="week4Date"
                      type="date"
                      value={formData.week4Date}
                      onChange={(e) => setFormData({ ...formData, week4Date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Batismo */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-cyan-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Batismo nas Águas
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="baptismDate">Data do Batismo</Label>
                  <Input
                    id="baptismDate"
                    type="date"
                    value={formData.baptismDate}
                    onChange={(e) => setFormData({ ...formData, baptismDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="observations">Observações Gerais</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Outras informações importantes sobre o acompanhamento..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" disabled={loading} className="min-w-[120px]">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ações e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {showForm ? 'Fechar Formulário' : 'Novo Convertido'}
        </Button>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <ExcelConsolidacaoReportButton convertidos={novosConvertidos} />
      </div>

      {/* Lista - Cards removidos conforme solicitado */}
      {loading && novosConvertidos.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredConvertidos.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nenhum convertido registrado"
          description="Clique em 'Novo Convertido' para começar o cadastro."
        />
      ) : (
        <EmptyState
          icon={UserPlus}
          title={`${filteredConvertidos.length} convertido(s) cadastrado(s)`}
          description="Use o formulário acima para gerenciar os registros."
        />
      )}

      {/* Diálogo de confirmação */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir registro?"
        description="Esta ação não pode ser desfeita. O registro do convertido será removido permanentemente."
        confirmLabel="Excluir"
        variant="destructive"
      />
    </div>
  );
}
