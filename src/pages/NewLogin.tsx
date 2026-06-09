import { useState, useRef, useEffect } from 'react';
import { Shield, User, Users, Briefcase, ArrowRight, MapPin, Church, Mail, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';
import { authService } from '@/services/auth.service';
import { UNRESTRICTED_EMAILS } from '@/lib/constants';
import { testSupabaseConnection } from '@/lib/supabaseClient';
import { z } from 'zod';
import { useTenant } from '@/hooks/useTenant';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Step = 1 | 2;

const step1Schema = z.object({
    fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120, 'Nome muito longo'),
    email: z.string().min(1, 'E-mail é obrigatório').email('Informe um e-mail válido'),
});

const forgotSchema = z.object({
    email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
});

interface FormData {
    fullName: string;
    email: string;
    role: UserRole;
    pin: string[];
}

export default function NewLogin() {
    useDocumentTitle('Login');

    const { tenant } = useTenant();

    // Força o tema oceano nas páginas públicas
    useEffect(() => {
        // Aplica imediatamente o tema
        document.documentElement.setAttribute('data-theme', 'oceano-profundo');
        document.body.setAttribute('data-theme', 'oceano-profundo');

        // Se ?trial=1, marcar para signup trial
        const params = new URLSearchParams(window.location.search);
        if (params.get('trial') === '1') {
            try { sessionStorage.setItem('trial_signup', '1'); } catch {}
        }

        // Cleanup: restaura o tema do usuário apenas se estiver navegando para área autenticada
        return () => {
            // Só restaura se não estiver indo para outra página pública
            const path = window.location.pathname;
            const publicPages = ['/', '/login', '/checkout', '/hotmart-success'];
            if (!publicPages.includes(path)) {
                const savedTheme = localStorage.getItem('church_theme_v2') || 'oceano-profundo';
                document.documentElement.setAttribute('data-theme', savedTheme);
                document.body.setAttribute('data-theme', savedTheme);
            }
        };
    }, []);

    const [step, setStep] = useState<Step>(1);
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        role: 'membro',
        pin: ['', '', '', '', '', ''],
    });
    const [error, setError] = useState('');
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [connectionTestOpen, setConnectionTestOpen] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{ urlConfigured: boolean; keyConfigured: boolean; ok: boolean; error?: string } | null>(null);
    const [connectionTestLoading, setConnectionTestLoading] = useState(false);
    const { login } = useAuth();
    const { toast } = useToast();
    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleWelcomeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = step1Schema.safeParse({ fullName: formData.fullName.trim(), email: formData.email.trim() });
        if (!result.success) {
            const msg = result.error.errors.map(e => e.message).join('. ');
            setError(msg);
            return;
        }
        // E-mail sem restrição: pré-seleciona SuperAdmin
        const email = formData.email.trim().toLowerCase();
        if (UNRESTRICTED_EMAILS.some(e => e.trim().toLowerCase() === email)) {
            setFormData(f => ({ ...f, role: 'superadmin' }));
        }
        setStep(2);
    };

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = [...formData.pin];
        newPin[index] = value.slice(-1);
        setFormData({ ...formData, pin: newPin });

        // Move to next input
        if (value && index < 5) {
            pinRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !formData.pin[index] && index > 0) {
            pinRefs.current[index - 1]?.focus();
        }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const pinString = formData.pin.join('');

            if (pinString.length < 6) {
                setError('O PIN deve ter exatamente 6 dígitos.');
                return;
            }

            // A função login agora é assíncrona e realiza a autenticação real no Supabase
            const success = await login(formData.email, pinString, formData.role, formData.fullName);

            if (success) {
                // O App.tsx cuidará do redirecionamento ao detectar que o user não é mais null
            } else {
                setError('E-mail ou PIN incorretos.');
            }
        } catch (err: any) {
            console.error('Erro no login:', err);
            setError(err.message || 'Ocorreu um erro ao tentar entrar. Tente novamente.');
        }
    };

    const handleConnectionTest = async () => {
        setConnectionTestLoading(true);
        setConnectionTestResult(null);
        setConnectionTestOpen(true);
        try {
            const r = await testSupabaseConnection();
            setConnectionTestResult(r);
        } catch {
            setConnectionTestResult({ urlConfigured: false, keyConfigured: false, ok: false, error: 'Erro ao testar.' });
        } finally {
            setConnectionTestLoading(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = forgotSchema.safeParse({ email: forgotEmail.trim() });
        if (!result.success) {
            const msg = result.error.errors.map(e => e.message).join('. ');
            toast({ title: msg, variant: 'destructive' });
            return;
        }
        const email = result.data.email;
        setForgotLoading(true);
        try {
            await authService.resetPassword(email);
            toast({
                title: 'E-mail enviado',
                description: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.',
            });
            setForgotOpen(false);
            setForgotEmail('');
        } catch (err: any) {
            toast({
                title: 'Erro ao enviar',
                description: err?.message || 'Não foi possível enviar o e-mail. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <div className="w-full max-w-[360px] relative z-10">
                {/* TELA 1: BOAS-VINDAS */}
                {step === 1 && (
                    <Card className="shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-4">
                            <div className="text-center mb-4">
                                <div className="flex justify-center mb-4">
                                    <Logo size="md" showText={false} />
                                </div>
                                {tenant?.name && (
                                    <h1 className="text-xl font-bold">
                                        <span className="text-slate-900">{tenant.name}</span>
                                    </h1>
                                )}
                                <p className="text-xl font-bold text-primary mt-3">Seja bem Vindo</p>
                                <h2 className="text-base font-semibold">Acessar sistema</h2>
                                <p className="text-xs text-muted-foreground">Entre com seus dados para continuar</p>
                            </div>

                            <form onSubmit={handleWelcomeSubmit} className="space-y-3">
                                <div className="space-y-2">
                                    <Input
                                        type="text"
                                        placeholder="Seu Nome"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="h-10 rounded-full"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="email"
                                        placeholder="E-mail"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-10 rounded-full"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="text-xs text-destructive text-center">
                                        {error}
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-10 rounded-full" size="sm">
                                    Próximo
                                </Button>
                                
                                <div className="flex flex-col gap-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => { setForgotEmail(formData.email); setForgotOpen(true); }}
                                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Esqueci minha senha
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConnectionTest}
                                        disabled={connectionTestLoading}
                                        className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors uppercase"
                                    >
                                        {connectionTestLoading ? 'Verificando...' : 'Status da Conexão'}
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* TELA 2: PIN E PERFIL */}
                {step === 2 && (
                    <Card className="shadow-sm w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <h2 className="text-lg font-semibold">Verificação</h2>
                                <p className="text-sm text-muted-foreground">Informe seu PIN e selecione sua função</p>
                            </div>

                            <form onSubmit={handleFinalSubmit} className="space-y-6">
                                {/* PIN Container */}
                                <div className="flex justify-center gap-2 w-full">
                                    {formData.pin.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => (pinRefs.current[i] = el)}
                                            type="password"
                                            maxLength={1}
                                            inputMode="numeric"
                                            value={digit}
                                            onChange={(e) => handlePinChange(i, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(i, e)}
                                            className="w-10 h-12 text-center text-lg font-bold border rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        />
                                    ))}
                                </div>

                                {/* Seleção de Perfil */}
                                <div className="grid grid-cols-2 gap-3">
                                    <RoleButton
                                        icon={<Shield size={16} />}
                                        label="Pastor"
                                        active={formData.role === 'admin'}
                                        onClick={() => setFormData({ ...formData, role: 'admin' })}
                                    />
                                    <RoleButton
                                        icon={<User size={16} />}
                                        label="Secretário"
                                        active={formData.role === 'secretario'}
                                        onClick={() => setFormData({ ...formData, role: 'secretario' })}
                                    />
                                    <RoleButton
                                        icon={<Briefcase size={16} />}
                                        label="Tesoureiro"
                                        active={formData.role === 'tesoureiro'}
                                        onClick={() => setFormData({ ...formData, role: 'tesoureiro' })}
                                    />
                                    <RoleButton
                                        icon={<Users size={16} />}
                                        label="Membro"
                                        active={formData.role === 'membro'}
                                        onClick={() => setFormData({ ...formData, role: 'membro' })}
                                    />
                                    <RoleButton
                                        icon={<MapPin size={16} />}
                                        label="Célula"
                                        active={formData.role === 'lider_celula'}
                                        onClick={() => setFormData({ ...formData, role: 'lider_celula' })}
                                    />
                                    <RoleButton
                                        icon={<Church size={16} />}
                                        label="Ministério"
                                        active={formData.role === 'lider_ministerio'}
                                        onClick={() => setFormData({ ...formData, role: 'lider_ministerio' })}
                                    />
                                    <RoleButton
                                        icon={<Archive size={16} />}
                                        label="Patrimônio"
                                        active={formData.role === 'diretor_patrimonio'}
                                        onClick={() => setFormData({ ...formData, role: 'diretor_patrimonio' })}
                                    />
                                    <RoleButton
                                        icon={<Shield size={16} />}
                                        label="Admin"
                                        active={formData.role === 'superadmin'}
                                        onClick={() => setFormData({ ...formData, role: 'superadmin' })}
                                    />
                                </div>

                                {error && (
                                    <div className="text-sm text-destructive text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        className="w-full rounded-full"
                                        size="lg"
                                        disabled={formData.pin.some(digit => !digit)}
                                    >
                                        Entrar
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Voltar
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Diálogos */}
            <Dialog open={connectionTestOpen} onOpenChange={setConnectionTestOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Diagnóstico</DialogTitle>
                        <DialogDescription>
                            Verificação de conexão com o servidor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        {connectionTestLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Testando...</p>
                        ) : connectionTestResult ? (
                            <div className="space-y-2">
                                <StatusItem label="URL do Banco" ok={connectionTestResult.urlConfigured} />
                                <StatusItem label="Chave de API" ok={connectionTestResult.keyConfigured} />
                                <StatusItem label="Status Final" ok={connectionTestResult.ok} error={connectionTestResult.error} />
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Recuperar Senha</DialogTitle>
                        <DialogDescription>
                            Enviaremos um link para o seu e-mail.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotSubmit} className="space-y-4 pt-2">
                        <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                        />
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={forgotLoading}>
                                {forgotLoading ? 'Enviando...' : 'Enviar Link'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusItem({ label, ok, error }: { label: string; ok: boolean; error?: string }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 border">
            <span className="text-xs font-medium">{label}</span>
            {ok ? (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">OK</span>
            ) : (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{error || 'ERRO'}</span>
            )}
        </div>
    );
}

function RoleButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-start gap-3 rounded-2xl border px-4 py-2.5 text-sm transition w-full
        ${active
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-muted hover:bg-muted text-muted-foreground'
                }`}
        >
            <span className={active ? 'text-primary' : 'text-muted-foreground opacity-70'}>
                {icon}
            </span>
            <span>{label}</span>
        </button>
    );
}






