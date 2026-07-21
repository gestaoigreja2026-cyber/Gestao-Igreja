import { useEffect, useMemo, useState } from 'react';
import { Save, Loader2, DollarSign, CreditCard, Copy, Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePermissions } from '@/hooks/usePermissions';
import { churchesService } from '@/services/churches.service';

// qrcode-pix exporta QrCodePix como export nomeado
// (o polyfill de Buffer já está em src/main.tsx).
import { QrCodePix } from 'qrcode-pix';

function normalizePixText(input: string, maxLen: number) {
  // PIX EMV usa ASCII; removemos acentos e normalizamos espaços.
  const s = (input || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '') // remove caracteres especiais (mantém letras/números/_/espaço/./-)
    .replace(/\s+/g, ' ')
    .toUpperCase();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
] as const;

export default function PixDonations() {
  useDocumentTitle('Contas e PIX Igreja');
  const { churchId, viewingChurch, user } = useAuth();
  const { toast } = useToast();
  const { canEditPixDonations } = usePermissions();
  const effectiveChurchId = viewingChurch?.id ?? churchId ?? user?.churchId;

  const canEdit = canEditPixDonations;

  const [church, setChurch] = useState<{
    pix_key?: string | null;
    pix_key_type?: string | null;
    pix_beneficiary_name?: string | null;
    pix_city?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState(''); // opcional
  const [message, setMessage] = useState('Dízimo/Oferta');
  const [pixCopyPaste, setPixCopyPaste] = useState<string>('');
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string>('');

  useEffect(() => {
    if (effectiveChurchId) loadData();
  }, [effectiveChurchId]);

  async function loadData() {
    if (!effectiveChurchId) return;
    setLoading(true);
    try {
      const churchData = await churchesService.getById(effectiveChurchId);
      setChurch(churchData as any);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePixConfig() {
    if (!effectiveChurchId || !church || !canEdit) return;
    setSaving(true);
    try {
      await churchesService.update(effectiveChurchId, {
        pix_key: church.pix_key || null,
        pix_key_type: church.pix_key_type || null,
        pix_beneficiary_name: church.pix_beneficiary_name || null,
        pix_city: church.pix_city || null,
      });
      toast({ title: 'Salvo!', description: 'Dados PIX atualizados.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const qrEnabled = useMemo(() => {
    const key = (church?.pix_key || '').trim();
    const name = (church?.pix_beneficiary_name || '').trim();
    const city = (church?.pix_city || '').trim();
    return !!key && !!name && !!city;
  }, [church?.pix_key, church?.pix_beneficiary_name, church?.pix_city]);

  useEffect(() => {
    // Gera QR automaticamente quando os campos mínimos estiverem preenchidos
    let cancelled = false;
    async function build() {
      if (!qrEnabled) {
        setPixCopyPaste('');
        setPixQrDataUrl('');
        setQrError('');
        return;
      }
      setQrLoading(true);
      try {
        const key = (church?.pix_key || '').trim();
        const name = normalizePixText(church?.pix_beneficiary_name || '', 25);
        const city = normalizePixText(church?.pix_city || '', 15);
        const txid = 'GESTAOIGREJA';
        const v = amount.trim() ? Number(String(amount).replace(',', '.')) : undefined;

        const qr = QrCodePix({
          version: '01',
          key,
          name,
          city,
          transactionId: txid, // max 25
          message: normalizePixText(message || '', 50) || undefined,
          value: typeof v === 'number' && !Number.isNaN(v) && v > 0 ? v : undefined,
        });

        const payload =
          typeof (qr as any)?.payload === 'function' ? (qr as any).payload() : '';

        const base64 =
          typeof (qr as any)?.base64 === 'function' ? await (qr as any).base64() : '';

        if (cancelled) return;

        setPixCopyPaste(payload || '');
        if (typeof base64 === 'string' && base64) {
          setPixQrDataUrl(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
        } else {
          setPixQrDataUrl('');
        }
        setQrError(payload ? '' : 'Não foi possível gerar o código PIX. Verifique os dados e tente novamente.');
      } catch (e: any) {
        if (!cancelled) {
          setPixCopyPaste('');
          setPixQrDataUrl('');
          const msg = e?.message ? String(e.message) : 'Falha ao gerar QR Code.';
          setQrError(msg);
          console.error('[PIX QR] erro ao gerar', e);
        }
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    }
    build();
    return () => { cancelled = true; };
  }, [qrEnabled, church?.pix_key, church?.pix_beneficiary_name, church?.pix_city, amount, message]);

  async function handleCopyPix() {
    if (!pixCopyPaste) {
      toast({ title: 'Preencha os dados', description: 'Informe chave, beneficiário e cidade para gerar o PIX.', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(pixCopyPaste);
      toast({ title: 'Copiado!', description: 'Código PIX copia e cola copiado.', duration: 2000 });
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Copie manualmente o código exibido.', variant: 'destructive' });
    }
  }

  function handleDownloadQr() {
    if (!pixQrDataUrl) {
      toast({ title: 'QR não disponível', description: 'Gere o QR Code para baixar.', variant: 'destructive' });
      return;
    }
    const a = document.createElement('a');
    a.href = pixQrDataUrl;
    a.download = `pix-${(church?.pix_beneficiary_name || 'igreja').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }

  if (!effectiveChurchId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Selecione uma igreja</h2>
        <p className="text-muted-foreground">É necessário ter uma igreja vinculada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" />
          Contas e PIX Igreja
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure as chaves PIX e dados bancários da igreja para recebimento de dízimos e ofertas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Chave PIX da igreja
          </CardTitle>
          <CardDescription>
            Cadastre a chave PIX para que os membros possam fazer transferências e doações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tipo da chave</Label>
                <Select
                  value={church?.pix_key_type || ''}
                  onValueChange={(v) =>
                    setChurch((p) => (p ? { ...p, pix_key_type: v || null } : null))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  placeholder="email@igreja.com.br ou CPF/CNPJ/telefone"
                  value={church?.pix_key || ''}
                  onChange={(e) =>
                    setChurch((p) => (p ? { ...p, pix_key: e.target.value || null } : null))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_name">Nome do beneficiário</Label>
                <Input
                  id="pix_name"
                  placeholder="Nome da igreja ou associação"
                  maxLength={25}
                  value={church?.pix_beneficiary_name || ''}
                  onChange={(e) =>
                    setChurch((p) =>
                      p ? { ...p, pix_beneficiary_name: e.target.value || null } : null
                    )
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_city">Cidade (UF)</Label>
                <Input
                  id="pix_city"
                  placeholder="Ex: SAO PAULO SP"
                  maxLength={15}
                  value={church?.pix_city || ''}
                  onChange={(e) =>
                    setChurch((p) => (p ? { ...p, pix_city: e.target.value || null } : null))
                  }
                  disabled={!canEdit}
                />
              </div>
              {canEdit && (
                <Button onClick={handleSavePixConfig} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar dados PIX
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code PIX (profissional)
          </CardTitle>
          <CardDescription>
            Gere o QR Code e o código “copia e cola” para receber dízimos e ofertas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pix_amount">Valor (opcional)</Label>
              <Input
                id="pix_amount"
                placeholder="Ex: 50,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Se deixar vazio, o doador escolhe o valor.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix_msg">Descrição (opcional)</Label>
              <Input
                id="pix_msg"
                placeholder="Ex: Dízimo/Oferta"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Aparece como identificação no pagamento (quando suportado).</p>
            </div>
          </div>

          {!qrEnabled && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Preencha acima: <strong>Chave PIX</strong>, <strong>Nome do beneficiário</strong> e <strong>Cidade (UF)</strong> para gerar o QR.
            </div>
          )}
          {!!qrError && qrEnabled && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {qrError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
            <div className="rounded-xl border border-border bg-muted/10 p-4 flex flex-col items-center justify-center min-h-[240px]">
              {qrLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : pixQrDataUrl ? (
                <img
                  src={pixQrDataUrl}
                  alt="QR Code PIX"
                  className="w-[200px] h-[200px] object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <QrCode className="h-10 w-10 mx-auto opacity-40 mb-2" />
                  QR Code aparecerá aqui
                </div>
              )}

              <div className="flex gap-2 mt-4 w-full">
                <Button variant="outline" className="flex-1" onClick={handleCopyPix} disabled={!pixCopyPaste}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button className="flex-1" onClick={handleDownloadQr} disabled={!pixQrDataUrl}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Copia e cola</Label>
              <textarea
                value={pixCopyPaste}
                readOnly
                placeholder="O código PIX (copia e cola) vai aparecer aqui."
                className="w-full min-h-[240px] rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Dica: você pode colar esse código em geradores/checkout e também enviar por WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
