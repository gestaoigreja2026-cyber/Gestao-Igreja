import { useState, useEffect } from 'react';
import { AlertCircle, Copy, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_PIX } from '@/lib/subscriptionConfig';
import { churchesService } from '@/services/churches.service';
import { asaasService } from '@/services/asaas.service';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

/**
 * Bloqueia o uso do sistema quando a igreja está inadimplente ou suspensa.
 * SuperAdmin e rotas públicas não passam por este componente.
 */
export function SubscriptionBlock({ children }: { children: React.ReactNode }) {
  const { user, church } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ status: string; blocked: boolean; asaas_customer_id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user || user.role === 'superadmin') {
      setStatus({ status: 'ativa', blocked: false });
      setLoading(false);
      return;
    }
    // Tesoureiro, secretário, diretor de patrimônio e pastor_admin não precisam verificar status de assinatura para acessar funcionalidades básicas
    if (user.role === 'tesoureiro' || user.role === 'secretario' || user.role === 'diretor_patrimonio' || user.role === 'pastor_admin') {
      console.log('SubscriptionBlock: User exempt from subscription check - Role:', user.role);
      setStatus({ status: 'ativa', blocked: false });
      setLoading(false);
      return;
    }
    // TEMPORÁRIO: Desabilitar bloqueio para permitir acesso a todos
    console.log('SubscriptionBlock: TEMPORARY - Blocking disabled for all users');
    setStatus({ status: 'ativa', blocked: false });
    setLoading(false);
    return;
    
    console.log('SubscriptionBlock: Checking subscription status for role:', user.role);
    churchesService.getMyChurchSubscriptionStatus().then((s) => {
      console.log('SubscriptionBlock: Status received:', s);
      setStatus(s);
      setLoading(false);
    }).catch((error) => {
      console.error('SubscriptionBlock: Error checking status:', error);
      setStatus({ status: 'ativa', blocked: false });
      setLoading(false);
    });
  }, [user?.id, user?.role]);

  const handleAsaasPayment = async () => {
    if (!church?.id) return;
    setPaying(true);
    try {
      const url = await asaasService.createPaymentLink(church.id);
      if (url) {
        window.open(url, '_blank');
      } else {
        toast({
          title: 'Erro ao gerar link',
          description: 'Não encontramos faturas pendentes. Se você já pagou, aguarde a compensação.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Falha na comunicação',
        description: 'Tente novamente em instantes ou use o PIX manual.',
        variant: 'destructive'
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading || !status?.blocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl shadow-lg p-8 text-center">
        <div className="flex justify-start mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao App
          </Button>
        </div>
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground text-sm mb-6">
          O acesso da sua igreja a esta plataforma está temporariamente interrompido. Isso pode ocorrer por pendências financeiras ou por decisão administrativa.
        </p>

        {status.asaas_customer_id && (
          <div className="mb-6">
            <Button 
              className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20 gap-2"
              onClick={handleAsaasPayment}
              disabled={paying}
            >
              {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              PAGAR AGORA (Cartão/Boleto/Pix)
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              A liberação é imediata após a confirmação do pagamento pelo Asaas.
            </p>
          </div>
        )}

        <div className="space-y-2 text-left text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
          <p>• Vencimento: <strong>30 dias</strong> após o pagamento (ou fim do teste)</p>
          <p>• Tolerância: <strong>5 dias</strong> após o vencimento</p>
          <p>• Após essa data: <strong>suspensão automática</strong> até regularização</p>
          <p>• Após o pagamento, o sistema retorna automaticamente</p>
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20 text-left">
          <p className="font-semibold text-foreground mb-2 flex items-center justify-between">
            Pagamento via PIX Direto
            {!status.asaas_customer_id && <Badge variant="outline" className="text-[10px]">Recomendado</Badge>}
          </p>
          <p className="text-sm mb-1"><strong>Chave:</strong> <span className="font-mono">{SUBSCRIPTION_PIX.pixKey}</span>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(SUBSCRIPTION_PIX.pixKey); toast({ title: 'Chave PIX copiada!', duration: 2000 }); }} className="ml-2 text-primary hover:underline inline-flex items-center gap-1" title="Copiar"><Copy className="h-3.5 w-3.5" /> Copiar</button>
          </p>
          <p className="text-sm"><strong>Titular:</strong> {SUBSCRIPTION_PIX.holderName} · {SUBSCRIPTION_PIX.bank}</p>
          <p className="text-xs text-muted-foreground mt-2">1) Informe o nome da igreja no PIX antes de pagar.</p>
          <p className="text-xs text-muted-foreground">2) Envie o comprovante para <a href={`mailto:${SUBSCRIPTION_PIX.receiptEmail}?subject=Comprovante%20PIX%20-%20Mensalidade`} className="text-primary underline font-medium">gestaoigreja@gmail.com</a></p>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          Se você acredita que isso é um erro ou já regularizou sua situação, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
