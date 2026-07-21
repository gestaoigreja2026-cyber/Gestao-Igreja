import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Users, Briefcase, MapPin, Church, Archive, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export default function SimpleLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [logoSrc, setLogoSrc] = useState<string | undefined>();
    const [bannerSrc, setBannerSrc] = useState('/banner-login.png');

    const handleLogin = (role: UserRole, name: string) => {
        login('user@igreja.com', '123456', role, name);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative px-4 py-12 bg-background">
            {/* Background (removed banner) */}

            <div className="w-full max-w-2xl relative z-10">
                <Card className="shadow-2xl border-primary/10 overflow-hidden">
                    <CardContent className="p-8">
                        <div className="text-center mb-10">
                                <div className="flex justify-center mb-6 relative">
                                    <Logo
                                        size="xl"
                                        showText={false}
                                        overrideSrc={logoSrc}
                                        editable
                                        onFile={(file) => {
                                            const reader = new FileReader();
                                            reader.onload = () => setLogoSrc(String(reader.result));
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </div>

                                <div className="w-full max-w-xl mx-auto mb-8">
                                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-primary/20 shadow-md">

                                        <img
                                            src={bannerSrc}
                                            alt="Banner Login"
                                            className="w-full h-full object-cover"
                                        />

                                        <label className="absolute bottom-3 right-3 cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    const reader = new FileReader();

                                                    reader.onload = () =>
                                                        setBannerSrc(String(reader.result));

                                                    reader.readAsDataURL(file);
                                                }}
                                            />

                                            <div className="bg-primary text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 hover:opacity-90 transition">
                                                <UploadCloud className="w-5 h-5" />
                                                Alterar Banner
                                            </div>
                                        </label>

                                    </div>
                                </div>
                            <h1 className="text-3xl font-black tracking-tight mb-2">
                                Gestão <span className="text-primary">Church</span>
                            </h1>
                            <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mb-4"></div>
                            <h2 className="text-xl font-bold text-foreground/80">Escolha seu Perfil</h2>
                            <p className="text-sm text-muted-foreground mt-2">Clique no seu perfil para entrar</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <RoleCard
                                icon={<Shield className="h-6 w-6" />}
                                label="Pastor"
                                onClick={() => handleLogin('admin', 'Pastor')}
                            />
                            <RoleCard
                                icon={<User className="h-6 w-6" />}
                                label="Secretário"
                                onClick={() => handleLogin('secretario', 'Secretário')}
                            />
                            <RoleCard
                                icon={<Briefcase className="h-6 w-6" />}
                                label="Tesoureiro"
                                onClick={() => handleLogin('tesoureiro', 'Tesoureiro')}
                            />
                            <RoleCard
                                icon={<MapPin className="h-6 w-6" />}
                                label="Líder Célula"
                                onClick={() => handleLogin('lider_celula', 'Líder de Célula')}
                            />
                            <RoleCard
                                icon={<Church className="h-6 w-6" />}
                                label="Líder Minis."
                                onClick={() => handleLogin('lider_ministerio', 'Líder de Ministério')}
                            />
                            <RoleCard
                                icon={<Users className="h-6 w-6" />}
                                label="Membro"
                                onClick={() => handleLogin('membro', 'Membro')}
                            />
                            <RoleCard
                                icon={<Archive className="h-6 w-6" />}
                                label="Patrimônio"
                                onClick={() => handleLogin('diretor_patrimonio', 'Diretor(a) de Patrimônio')}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RoleCard({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border-2 border-muted/50 hover:border-primary hover:bg-primary/10 transition-all duration-300 hover:scale-105 hover:shadow-lg group"
        >
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary group-hover:scale-110 transition-transform">
                <div className="text-white">{icon}</div>
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-center">{label}</span>
        </button>
    );
}
