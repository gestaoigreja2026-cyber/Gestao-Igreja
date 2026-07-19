import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Church, FileText, DollarSign, Check, ArrowRight, Download, LogIn, LayoutDashboard, Fingerprint, Video, UserPlus, Gift, Send, Phone, Mail,
  MessageSquare, TrendingUp, Shield, Smartphone, X, Crown, Zap, Star, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/Logo';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';

import { APP_NAME } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAssistant } from '@/components/AIAssistant';
import { InstallPrompt, InstallHeroButton } from '@/components/InstallPrompt';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const pillars = [
  {
    icon: Users,
    title: 'Gestão de Membros',
    description: 'Controle total de membros, congregados e visitantes com perfis detalhados e busca inteligente.',
    features: ['Secretaria Digital', 'Emissão de Certificados', 'Carteirinhas Automáticas']
  },
  {
    icon: DollarSign,
    title: 'Finanças e PIX',
    description: 'Gestão transparente de dízimos e ofertas com QR Code PIX integrado e relatórios de caixa.',
    features: ['Caixa Diário', 'Relatórios Financeiros', 'Doações Simplificadas']
  },
  {
    icon: Church,
    title: 'Ministérios e Células',
    description: 'Organize toda a estrutura da sua igreja, acompanhe lideranças e frequências em tempo real.',
    features: ['Escalas de Culto', 'Controle de Células', 'Gestão de Ministérios']
  },
  {
    icon: TrendingUp,
    title: 'Inteligência e Dados',
    description: 'Decisões baseadas em dados com dashboards analíticos e gráficos de crescimento.',
    features: ['Gráficos de Novos Convertidos', 'Estatísticas Gerais', 'Relatórios Exportáveis']
  }
];

const PLAN_FEATURES = [
  'Gestão completa de membros',
  'Controle financeiro',
  'Células e ministérios',
  'Relatórios avançados',
  'Boletins e avisos',
  'Suporte prioritário',
  'Cancele quando quiser',
];

const plans = [
  {
    id: 'starter',
    icon: Zap,
    name: 'Starter',
    memberRange: 'Até 100 membros',
    price: 199,
    description: 'Perfeito para igrejas em crescimento que estão dando os primeiros passos na gestão digital.',
    color: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    featured: false,
    features: PLAN_FEATURES
  },
  {
    id: 'growth',
    icon: Star,
    name: 'Growth',
    memberRange: '100 a 500 membros',
    price: 299,
    description: 'Para igrejas em expansão que precisam de mais recursos e controle sobre sua congregação.',
    color: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    featured: true,
    features: PLAN_FEATURES
  },
  {
    id: 'professional',
    icon: Crown,
    name: 'Professional',
    memberRange: '500 a 2.000 membros',
    price: 499,
    description: 'Solução completa para igrejas consolidadas com gestão avançada e análise de dados.',
    color: 'from-purple-500 to-violet-600',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200 dark:border-purple-800',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    featured: false,
    features: PLAN_FEATURES
  },
  {
    id: 'enterprise',
    icon: Building2,
    name: 'Enterprise',
    memberRange: 'Mais de 2.000 membros',
    price: 1200,
    description: 'Para grandes igrejas e redes com múltiplos campus e gestão centralizada.',
    color: 'from-orange-500 to-red-600',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200 dark:border-orange-800',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    featured: false,
    features: PLAN_FEATURES
  }
];

const PurchaseCard = ({ timeLeft }: { timeLeft: number }) => (
  <div className="max-w-xl mx-auto p-1 rounded-3xl bg-gradient-to-br from-primary via-cyan-400 to-blue-600 shadow-2xl backdrop-blur-md">
    <div className="bg-background/95 rounded-[1.4rem] p-8 md:p-10">
      <div className="flex flex-col items-center text-center gap-6">
        <div className="px-4 py-2 bg-primary/10 rounded-full text-primary font-mono text-3xl font-bold tracking-tighter">
          {formatTime(timeLeft)}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-primary uppercase tracking-[0.2em]">Oferta de Lançamento</p>
          <h3 className="text-3xl font-black text-foreground leading-tight">
            A partir de <br />
            <span className="text-4xl text-primary">R$ 199/mês</span>
          </h3>
          <p className="text-muted-foreground">Planos a partir de 100 membros</p>
        </div>
        
        <div className="flex flex-col gap-3 w-full">
          <Link to="/checkout">
            <Button size="lg" className="w-full h-16 rounded-2xl font-black text-lg gap-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:scale-[1.02] transition-all">
              ESCOLHER MEU PLANO
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> 7 DIAS GRÁTIS</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> SEM FIDELIDADE</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
export default function Landing() {
  useDocumentTitle(APP_NAME);
  const { isAuthenticated } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20" data-theme="ceu-azul">
      {/* Header Premium */}
      <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md border-primary/10">
        <div className="container max-w-6xl mx-auto h-24 flex items-center justify-center gap-8 px-6">
          <Logo size="sm" showText={false} />
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm" className="rounded-full px-3 sm:px-6 font-bold text-xs sm:text-sm">Entrar</Button>
            </Link>
            <Link to="/checkout">
              <Button size="sm" className="rounded-full px-3 sm:px-6 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 text-xs sm:text-sm">
                <span className="hidden min-[480px]:inline">ASSINE AGORA</span>
                <span className="min-[480px]:hidden">ASSINAR</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Elite */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="container max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 text-primary bg-primary/5 rounded-full font-bold tracking-widest text-[10px] uppercase">
              O Futuro da sua Igreja começou
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black mb-8 leading-[1.05] tracking-tight text-foreground">
              Sua Igreja em um <br />
              <span className="text-primary">
                Novo Nível de Excelência.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              O hub definitivo para simplificar a administração e engajar a sua congregação. 
              Tecnologia de ponta a serviço do Reino.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/checkout">
                <Button size="lg" className="h-16 px-10 rounded-2xl font-black text-xl bg-primary shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                  ASSINE AGORA
                </Button>
              </Link>
              <InstallHeroButton />
            </div>
            <div className="flex -space-x-3 justify-center mt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                </div>
              ))}
              <div className="pl-6 text-sm font-bold text-muted-foreground flex items-center">
                +500 Igrejas Gerenciadas
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Background Decorative */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 blur-[150px] rounded-full -z-10" />
      </section>

      {/* Pilares de Excelência */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">4 Pilares do Sucesso Ministerial</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Tudo o que você precisa, organizado de forma inteligente e intuitiva.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {pillars.map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-background p-8 md:p-10 rounded-[2.5rem] border border-primary/10 shadow-xl hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                    <pillar.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black">{pillar.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {pillar.features.map(f => (
                        <span key={f} className="text-xs font-bold px-3 py-1 bg-muted rounded-full text-primary border border-primary/5">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SEÇÃO DE PLANOS ==================== */}
      <section className="py-32 bg-background" id="planos">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-primary/30 text-primary bg-primary/5 rounded-full font-bold tracking-widest text-[10px] uppercase">
              Planos e Preços
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Escolha o Plano Ideal para <br />
              <span className="text-primary">Sua Igreja</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Planos escaláveis conforme o crescimento da sua congregação. Comece pequeno e expanda quando precisar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative flex flex-col rounded-[2rem] border-2 p-7 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl ${
                    plan.featured
                      ? 'border-blue-400 bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                      : `${plan.borderColor} ${plan.bgColor}`
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest">
                      ⭐ Mais Popular
                    </div>
                  )}

                  <div className={`p-3 w-fit rounded-xl mb-5 ${plan.featured ? 'bg-white/20' : `bg-gradient-to-br ${plan.color} text-white`}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="mb-6">
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 ${plan.featured ? 'text-blue-200' : plan.textColor}`}>
                      {plan.name}
                    </p>
                    <p className={`text-sm font-semibold mb-3 ${plan.featured ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      {plan.memberRange}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-black ${plan.featured ? 'text-white' : 'text-foreground'}`}>
                        R$ {plan.price.toLocaleString('pt-BR')}
                      </span>
                      <span className={`text-sm font-medium ${plan.featured ? 'text-blue-200' : 'text-muted-foreground'}`}>/mês</span>
                    </div>
                    <p className={`text-xs mt-2 leading-relaxed ${plan.featured ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.featured ? 'text-blue-200' : plan.textColor}`} />
                        <span className={plan.featured ? 'text-blue-50' : 'text-foreground/80'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={`/checkout?plan=${plan.id}`} className="mt-auto">
                    <Button
                      className={`w-full font-bold rounded-xl py-5 gap-2 ${
                        plan.featured
                          ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-xl'
                          : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90 shadow-lg`
                      }`}
                    >
                      Assinar Plano {plan.name}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>


        </div>
      </section>

      {/* Seção de Vídeo - Imersiva */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-6">Assuma o Controle Total</h2>
            <p className="text-muted-foreground text-lg">Veja como o Gestão Igreja transforma a rotina administrativa em minutos.</p>
          </div>
          <div className="aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-8 border-background bg-black relative group">
             <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${import.meta.env.VITE_LANDING_VIDEO_ID || 'tg6745ZFLVw'}?rel=0`}
                title="Apresentação Gestão Igreja"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
          </div>
        </div>
      </section>

      {/* Call to Action Final */}
      <section className="py-32 bg-primary text-white overflow-hidden relative">
        <div className="container max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight">
            Pronto para transformar a <br /> sua gestão hoje?
          </h2>
          <div className="flex flex-col md:flex-row justify-center items-center gap-6">
             <Link to="/checkout">
                <Button size="lg" className="h-20 px-12 rounded-2xl font-black text-2xl bg-white text-primary hover:bg-slate-50 shadow-2xl hover:scale-105 transition-transform">
                  ASSINE AGORA
                </Button>
              </Link>
          </div>
        </div>
        
        {/* Decorative Blurs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-400 blur-[150px] opacity-30" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-800 blur-[150px] opacity-30" />
      </section>

      {/* Footer Minimalista */}
      <footer className="py-20 bg-background border-t">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 space-y-6">
              <Logo size="sm" showText={false} />
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                A plataforma de gestão eclesiástica mais completa e elegante do Brasil. 
                Desenvolvida para pastores que buscam excelência.
              </p>
              <div className="flex gap-4">
                 <a href="tel:+5591993837093" className="p-3 bg-muted rounded-xl hover:text-primary transition-colors"><Phone className="w-5 h-5" /></a>
                 <a href="mailto:edukadoshmda@gmail.com" className="p-3 bg-muted rounded-xl hover:text-primary transition-colors"><Mail className="w-5 h-5" /></a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-black text-lg">Links Úteis</h4>
              <nav className="flex flex-col gap-3 text-muted-foreground font-medium">
                <Link to="/login" className="hover:text-primary transition-colors">Entrar no Painel</Link>
                <a href="#planos" className="hover:text-primary transition-colors">Planos e Preços</a>
                <Link to="/checkout" className="hover:text-primary transition-colors">Assinar Agora</Link>
                <Link to="/cadastro-igreja-trial" className="hover:text-primary transition-colors">Abrir Conta Trial</Link>
              </nav>
            </div>

            <div className="space-y-4 text-right md:text-left">
              <h4 className="font-black text-lg">Suporte</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Segunda a Sexta <br />
                09:00 às 18:00 <br />
                <span className="text-primary font-bold">(91) 99383-7093</span>
              </p>
            </div>
          </div>
          
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground font-bold">
            <p>© {new Date().getFullYear()} — Todos os direitos reservados.</p>
            <p>CNPJ: 65.589.068/0001-01</p>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
}
