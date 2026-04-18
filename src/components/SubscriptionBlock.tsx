import { useState, useEffect } from 'react';
import { AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_PIX } from '@/lib/subscriptionConfig';
import { churchesService } from '@/services/churches.service';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Bloqueia o uso do sistema quando a igreja está inadimplente ou suspensa.
 * SuperAdmin e rotas públicas não passam por este componente.
 */
export function SubscriptionBlock({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<{ status: string; blocked: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role === 'superadmin') {
      setStatus({ status: 'ativa', blocked: false });
      setLoading(false);
      return;
    }
    churchesService.getMyChurchSubscriptionStatus().then((s) => {
      setStatus(s);
      setLoading(false);
    });
  }, [user?.id, user?.role]);

  if (loading || !status?.blocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl shadow-lg p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Serviço temporariamente suspenso</h1>
        <p className="text-muted-foreground text-sm mb-6">
          A mensalidade da sua igreja está em atraso. O acesso foi interrompido até a regularização do pagamento.
        </p>
        <div className="space-y-2 text-left text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
          <p>• Período de teste: <strong>7 dias</strong> grátis para novas igrejas</p>
          <p>• Vencimento: <strong>30 dias</strong> após o pagamento (ou fim do teste)</p>
          <p>• Tolerância: <strong>5 dias</strong> após o vencimento</p>
          <p>• Após essa data: <strong>suspensão automática</strong> até regularização</p>
          <p>• Após o pagamento, o sistema retorna automaticamente</p>
        </div>
        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 text-left">
          <p className="font-semibold text-foreground mb-2">Pagamento via PIX</p>
          <p className="text-sm mb-1"><strong>Chave:</strong> <span className="font-mono">{SUBSCRIPTION_PIX.pixKey}</span>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(SUBSCRIPTION_PIX.pixKey); toast({ title: 'Chave PIX copiada!', duration: 2000 }); }} className="ml-2 text-primary hover:underline inline-flex items-center gap-1" title="Copiar"><Copy className="h-3.5 w-3.5" /> Copiar</button>
          </p>
          <p className="text-sm"><strong>Titular:</strong> {SUBSCRIPTION_PIX.holderName} · {SUBSCRIPTION_PIX.bank}</p>
          <p className="text-xs text-muted-foreground mt-2">1) Informe o nome da igreja no PIX antes de pagar.</p>
          <p className="text-xs text-muted-foreground">2) Envie o comprovante para <a href={`mailto:${SUBSCRIPTION_PIX.receiptEmail}?subject=Comprovante%20PIX%20-%20Mensalidade`} className="text-primary underline font-medium">gestaoigreja@gmail.com</a></p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Após o PIX e envio do comprovante, aguarde o administrador registrar o pagamento para reativar o acesso.
        </p>
      </div>
    </div>
  );
}
