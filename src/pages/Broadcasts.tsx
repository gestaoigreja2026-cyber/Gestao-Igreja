import { useState, useEffect } from 'react';
import { Send, FileText, Megaphone, BookOpen, Loader2, Users, Shield, FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { broadcastsService, BroadcastType } from '@/services/broadcasts.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePermissions } from '@/hooks/usePermissions';

const BROADCAST_TYPES: { value: BroadcastType; label: string; icon: typeof FileText }[] = [
  { value: 'aviso', label: 'Aviso', icon: Megaphone },
  { value: 'boletim', label: 'Boletim', icon: FileText },
  { value: 'devocional', label: 'Devocional', icon: BookOpen },
];

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Informação' },
  { value: 'warning', label: 'Urgente' },
  { value: 'success', label: 'Sucesso' },
] as const;

export default function Broadcasts() {
  useDocumentTitle('Boletins e Avisos');
  const { user, churchId, viewingChurch } = useAuth();
  const { toast } = useToast();
  const { canEditBroadcasts } = usePermissions();

  const effectiveChurchId = viewingChurch?.id ?? churchId ?? user?.churchId;
  const canSend = canEditBroadcasts;

  const [broadcastType, setBroadcastType] = useState<BroadcastType>('aviso');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'success'>('info');
  const [leadersOnly, setLeadersOnly] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [leadersCount, setLeadersCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (effectiveChurchId) {
      Promise.all([
        broadcastsService.getRecipientCount(effectiveChurchId, false),
        broadcastsService.getRecipientCount(effectiveChurchId, true),
      ]).then(([all, leaders]) => {
        setRecipientCount(all);
        setLeadersCount(leaders);
      }).catch(() => {
        setRecipientCount(0);
        setLeadersCount(0);
      });
    } else {
      setRecipientCount(0);
      setLeadersCount(0);
    }
  }, [effectiveChurchId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB', variant: 'destructive' });
        return;
      }
      setPdfFile(file);
    } else if (file) {
      toast({ title: 'Apenas PDF permitido', variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!effectiveChurchId || !title.trim() || !message.trim()) {
      toast({ title: 'Preencha título e mensagem', variant: 'destructive' });
      return;
    }
    if (!canSend) {
      toast({ title: 'Sem permissão para enviar', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const result = await broadcastsService.send({
        churchId: effectiveChurchId,
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        leadersOnly,
        category: broadcastType,
      });

      if (result.success) {
        toast({
          title: 'Enviado!',
          description: `${result.count} notificação(ões) enviada(s). Os destinatários verão no sino de notificações.`,
        });
        setTitle('');
        setMessage('');
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!canSend) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas administradores, pastores e secretários podem enviar boletins e avisos.</p>
      </div>
    );
  }

  if (!effectiveChurchId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selecione uma igreja</h2>
        <p className="text-muted-foreground">É necessário ter uma igreja vinculada para enviar comunicações.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Boletins, Avisos e Devocionais</h1>
        <p className="text-muted-foreground mt-1">
          Envie comunicações para todos os usuários da igreja. Eles receberão no app e, se tiverem push ativado, também em segundo plano.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Novo envio
          </CardTitle>
          <CardDescription>
            {leadersOnly ? leadersCount : recipientCount} destinatário(s) receberão esta mensagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={broadcastType} onValueChange={(v) => setBroadcastType(v as BroadcastType)}>
            <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto p-1 scrollbar-hide snap-x">
              {BROADCAST_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-2 shrink-0 snap-start">
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="aviso" className="mt-4" />
            <TabsContent value="boletim" className="mt-4" />
            <TabsContent value="devocional" className="mt-4" />
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder={
                broadcastType === 'aviso' ? 'Ex: Culto cancelado amanhã' :
                broadcastType === 'boletim' ? 'Ex: Boletim Semanal - 17/02' :
                'Ex: Devocional do Dia - Filipenses 4:13'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder={
                broadcastType === 'aviso' ? 'Digite o aviso curto...' :
                broadcastType === 'boletim' ? 'Conteúdo do boletim (eventos, avisos da semana, etc.)' :
                'Escreva o devocional ou reflexão do dia...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-y min-h-[160px] text-base"
            />
          </div>

          {/* Upload de PDF */}
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">Anexar PDF (opcional)</Label>
            <div className="flex items-center gap-2">
              <label
                htmlFor="pdf-upload"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
              >
                <FileUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">
                  {pdfFile ? 'Trocar PDF' : 'Selecionar PDF'}
                </span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {pdfFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="p-1 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo 5MB. Apenas arquivos PDF.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Enviar para</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={!leadersOnly}
                  onChange={() => setLeadersOnly(false)}
                  className="rounded-full border-primary text-primary"
                />
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Todos os usuários</span>
                <span className="text-xs text-muted-foreground">({recipientCount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={leadersOnly}
                  onChange={() => setLeadersOnly(true)}
                  className="rounded-full border-primary text-primary"
                />
                <Shield className="h-4 w-4 text-primary" />
                <span>Canal exclusivo líderes</span>
                <span className="text-xs text-muted-foreground">({leadersCount})</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Canal líderes: admin, pastor, secretário, líder de célula, líder de ministério.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de notificação</Label>
            <Select value={notificationType} onValueChange={(v: any) => setNotificationType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Urgente destaca a notificação como prioridade.</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {leadersOnly ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              <span>{leadersOnly ? leadersCount : recipientCount} destinatário(s)</span>
              {leadersOnly && <span className="text-xs">(canal líderes)</span>}
            </div>
            <Button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
