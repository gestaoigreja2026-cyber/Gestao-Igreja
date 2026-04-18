import { useState } from 'react';
import { Shield, Info, FileCheck, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { authService } from '@/services/auth.service';

export default function Privacy() {
  useDocumentTitle('Privacidade e LGPD');
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [privacySettings, setPrivacySettings] = useState({
    shareData: true,
    receiveCommunications: true,
    showInDirectory: false,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Privacidade e LGPD
        </h1>
        <p className="text-muted-foreground mt-1">
          Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)
        </p>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-2 bg-primary/20 w-full" />
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileCheck className="h-5 w-5 text-primary" />
            Sobre seus Dados Pessoais
          </CardTitle>
          <CardDescription>
            Transparência e conformidade com a LGPD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-primary">Proteção de Dados</p>
              <p className="text-muted-foreground leading-relaxed">
                Em conformidade com a <strong>LGPD</strong>, informamos que seus dados são coletados exclusivamente para fins de gestão eclesiástica, comunicação de eventos e suporte espiritual. Seus dados estão protegidos em ambiente seguro e <strong>nunca serão vendidos ou compartilhados com terceiros</strong> fora do contexto da igreja sem seu consentimento expresso.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Suas Preferências</p>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <Checkbox
                id="shareData"
                checked={privacySettings.shareData}
                onCheckedChange={(c) => setPrivacySettings({ ...privacySettings, shareData: c === true })}
              />
              <div>
                <label htmlFor="shareData" className="text-sm font-medium cursor-pointer">
                  Compartilhamento de Dados para Gestão
                </label>
                <p className="text-xs text-muted-foreground">
                  Autorizo o uso dos meus dados para fins de organização interna, registros de frequência e suporte pastoral.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <Checkbox
                id="receiveCommunications"
                checked={privacySettings.receiveCommunications}
                onCheckedChange={(c) => setPrivacySettings({ ...privacySettings, receiveCommunications: c === true })}
              />
              <div>
                <label htmlFor="receiveCommunications" className="text-sm font-medium cursor-pointer">
                  Comunicações e Notificações
                </label>
                <p className="text-xs text-muted-foreground">
                  Desejo receber avisos sobre cultos, eventos, newsletters e mensagens da liderança.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <Checkbox
                id="showInDirectory"
                checked={privacySettings.showInDirectory}
                onCheckedChange={(c) => setPrivacySettings({ ...privacySettings, showInDirectory: c === true })}
              />
              <div>
                <label htmlFor="showInDirectory" className="text-sm font-medium cursor-pointer">
                  Visibilidade no Rol de Membros
                </label>
                <p className="text-xs text-muted-foreground">
                  Permitir que outros membros ativos vejam meu nome e foto no diretório da igreja.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-2 bg-primary/20 w-full" />
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-primary" />
            Alterar senha
          </CardTitle>
          <CardDescription>Defina uma nova senha. Mínimo de 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            disabled={newPassword.length < 6 || newPassword !== confirmPassword || changingPassword}
            onClick={async () => {
              setChangingPassword(true);
              try {
                await authService.updatePassword(newPassword);
                toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
                setNewPassword('');
                setConfirmPassword('');
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro ao alterar senha.';
                toast({ title: 'Erro', description: msg, variant: 'destructive' });
              } finally {
                setChangingPassword(false);
              }
            }}
          >
            {changingPassword ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
