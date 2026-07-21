import { useState, useEffect, useCallback } from 'react';
import { HandHeart, Send, Loader2, Heart, Trash2, Church, Phone, User, Calendar, Tag, ClipboardList, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  prayerRequestsService,
  PrayerRequest,
} from '@/services/prayerRequests.service';
import { churchesService } from '@/services/churches.service';
import { membersService } from '@/services/members.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExcelPrayerMonthlyReportButton } from '@/components/ExcelPrayerMonthlyReport';
export default function PrayerRequests() {
  useDocumentTitle('Solicitações de Oração');
  const { user, churchId, viewingChurch, switchChurch } = useAuth();
  const { toast } = useToast();
  const { canDeletePrayerRequests } = usePermissions();
  const effectiveChurchId = viewingChurch?.id ?? churchId ?? user?.churchId;
  const canEdit = canDeletePrayerRequests;
  const isSuperAdmin = user?.role === 'superadmin';

  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PrayerRequest | null>(null);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  
  // Novos campos do formulário
  const [requesterName, setRequesterName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<'saude' | 'familia' | 'financeiro' | 'espiritual' | 'outros'>('outros');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [testimony, setTestimony] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  const loadRequests = useCallback(async () => {
    if (!effectiveChurchId) return;
    setLoading(true);
    setSetupRequired(false);
    try {
      const data = await prayerRequestsService.list(effectiveChurchId);
      setRequests(data);
    } catch (e: any) {
      if (/prayer_requests|schema cache|does not exist/i.test(e?.message || '')) {
        setSetupRequired(true);
      } else {
        toast({ title: 'Erro ao carregar', description: e?.message, variant: 'destructive' });
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveChurchId, toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (isSuperAdmin && !effectiveChurchId) {
      churchesService.getAll().then((list: any[]) => {
        setChurches(list.map((c) => ({ id: c.id, name: c.name || c.slug || 'Igreja' })));
      }).catch(() => setChurches([]));
    }
  }, [isSuperAdmin, effectiveChurchId]);

  // Carregar membros para o select de responsável
  useEffect(() => {
    if (!effectiveChurchId) return;
    membersService.getAll()
      .then((list: any[]) => {
        setMembers(list.map((m) => ({ id: m.id, name: m.name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setMembers([]));
  }, [effectiveChurchId]);

  useEffect(() => {
    if (!effectiveChurchId) return;

    const unsubscribe = prayerRequestsService.subscribe(
      effectiveChurchId,
      (newRequest) => {
        setRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id)]);
      },
      (updated) => {
        setRequests((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      }
    );

    return unsubscribe;
  }, [effectiveChurchId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveChurchId || !content.trim()) {
      toast({ title: 'Digite sua solicitação', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const selectedMember = members.find(m => m.id === assignedTo);
      const newReq = await prayerRequestsService.create(effectiveChurchId, {
        content: content.trim(),
        isAnonymous: isAnonymous,
        requesterName: isAnonymous ? undefined : (requesterName || user?.name),
        contact: isAnonymous ? undefined : contact,
        category: category,
        assignedTo: assignedTo || undefined,
        assignedToName: selectedMember?.name,
        returnDate: returnDate || undefined,
        testimony: testimony.trim() || undefined,
      });
      setRequests((prev) => [newReq, ...prev]);
      // Reset form
      setContent('');
      setRequesterName('');
      setContact('');
      setCategory('outros');
      setAssignedTo('');
      setAssignedToName('');
      setReturnDate('');
      setTestimony('');
      setIsAnonymous(false);
      toast({ title: 'Enviado!', description: 'Sua solicitação de oração foi publicada.' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  async function handlePrayed(id: string) {
    try {
      await prayerRequestsService.incrementPrayed(id);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await prayerRequestsService.delete(deleteConfirm.id);
      setRequests((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast({ title: 'Removido', description: 'Pedido de oração excluído.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  }

  if (!effectiveChurchId) {
    if (isSuperAdmin && churches.length > 0) {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solicitações de Oração</h1>
            <p className="text-muted-foreground mt-1">Selecione uma igreja para ver e gerenciar os pedidos de oração.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="h-5 w-5" />
                Selecionar igreja
              </CardTitle>
              <CardDescription>Escolha a igreja para acessar as solicitações de oração.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(val) => {
                const ch = churches.find((c) => c.id === val);
                if (ch) switchChurch(val, ch.name);
              }}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Escolha uma igreja..." />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <HandHeart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selecione uma igreja</h2>
        <p className="text-muted-foreground">É necessário ter uma igreja vinculada para acessar as solicitações de oração.</p>
        {isSuperAdmin && churches.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">Nenhuma igreja cadastrada no momento.</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <HandHeart className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Solicitações de Oração</h1>
              <p className="text-muted-foreground mt-1">
                Envie pedidos e ore pelas necessidades da igreja. Atualização em tempo real.
              </p>
            </div>
          </div>
          <ExcelPrayerMonthlyReportButton requests={requests} />
        </div>
      </div>

      {setupRequired ? (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-lg">Configure o banco de dados</CardTitle>
            <CardDescription>
              Execute o arquivo <code className="text-xs">supabase/prayer_requests.sql</code> no SQL Editor do Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={loadRequests}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-primary" />
                Nova solicitação
              </CardTitle>
              <CardDescription>
                Compartilhe um pedido de oração com a igreja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Linha 1: Solicitante e Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requesterName" className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Solicitante
                    </Label>
                    <Input
                      id="requesterName"
                      placeholder="Nome completo"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      disabled={isAnonymous}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Contato
                    </Label>
                    <Input
                      id="contact"
                      placeholder="Telefone ou email"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      disabled={isAnonymous}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Linha 2: Categoria, Responsável e Data de Retorno */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Categoria
                    </Label>
                    <Select value={category} onValueChange={(val) => setCategory(val as any)}>
                      <SelectTrigger id="category" className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="familia">Família</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="espiritual">Espiritual</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo" className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      Responsável
                    </Label>
                    <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val)}>
                      <SelectTrigger id="assignedTo" className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {members.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground text-center">
                            Nenhum membro cadastrado
                          </div>
                        ) : (
                          members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="returnDate" className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Data Retorno
                    </Label>
                    <Input
                      id="returnDate"
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Pedido/Oração */}
                <div className="space-y-2">
                  <Label htmlFor="content" className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Pedido de Oração
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Descreva seu pedido de oração em detalhes..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="resize-y"
                    maxLength={1000}
                  />
                </div>

                {/* Testemunho */}
                <div className="space-y-2">
                  <Label htmlFor="testimony" className="flex items-center gap-2 text-sm">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Testemunho (resposta da oração)
                  </Label>
                  <Textarea
                    id="testimony"
                    placeholder="Compartilhe como Deus respondeu esta oração (opcional)..."
                    value={testimony}
                    onChange={(e) => setTestimony(e.target.value)}
                    rows={3}
                    className="resize-y"
                    maxLength={500}
                  />
                </div>

                {/* Checkbox Anônimo */}
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(c) => setIsAnonymous(!!c)}
                  />
                  <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                    Enviar como anônimo (ocultar solicitante e contato)
                  </Label>
                </div>

                <Button type="submit" disabled={sending || !content.trim()} className="w-full sm:w-auto">
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos de oração</CardTitle>
              <CardDescription>
                Novas solicitações aparecem automaticamente em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={HandHeart}
                  title="Nenhuma solicitação ainda"
                  description="Seja o primeiro a compartilhar um pedido de oração."
                />
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <p className="text-foreground whitespace-pre-wrap">{req.content}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            {req.is_anonymous ? 'Anônimo' : req.requester_name || 'Usuário'} •{' '}
                            {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary h-8 gap-1"
                              onClick={() => handlePrayed(req.id)}
                            >
                              <Heart className="h-4 w-4" />
                              <span>{req.prayed_count > 0 ? req.prayed_count : 'Orei'}</span>
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={() => setDeleteConfirm(req)}
                                title="Excluir pedido"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {req.prayed_count > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {req.prayed_count} oração(ões)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={!!deleteConfirm}
            onOpenChange={(o) => !o && setDeleteConfirm(null)}
            title="Excluir pedido de oração"
            description={deleteConfirm ? 'Tem certeza que deseja excluir este pedido de oração?' : ''}
            onConfirm={handleDelete}
            confirmLabel="Sim, excluir"
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}
