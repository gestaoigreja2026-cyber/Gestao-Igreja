import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Heart,
  Users,
  Award,
  Activity,
  PieChart as PieChartIcon,
  Loader2,
  Printer,
  FileDown,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { ExcelCompleteReportButton } from '@/components/ExcelCompleteReport';

import { financialService } from '@/services/financial.service';
import { membersService } from '@/services/members.service';
import { cellsService } from '@/services/cells.service';
import { DEFAULT_CHURCH_NAME } from '@/lib/constants';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// Mapeamento de cores fixas por categoria para consistência visual
const getCategoryColor = (name: string, index: number) => {
  const colorMap: Record<string, string> = {
    // Saídas Comuns
    'Aluguel': '#ef4444', // Vermelho
    'Água / Luz': '#06b6d4', // Ciano
    'Internet / Telefone': '#8b5cf6', // Roxo
    'Manutenção': '#f59e0b', // Laranja
    'Eventos': '#ec4899', // Rosa
    'Ministério de Louvor': '#22c55e', // Verde
    'Escola Bíblica': '#facc15', // Amarelo
    'Salários / Preletores': '#475569', // Cinza
    'Outras Saídas': '#6366f1', // Azul
    'Outros': '#94a3b8', // Cinza claro
  };

  return colorMap[name] || COLORS[index % COLORS.length];
};

export default function EvolucaoIgreja() {
  useDocumentTitle('Evolução da Igreja');
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [churchHealthData, setChurchHealthData] = useState<any>({
    attendance: [],
    newMembers: 0,
    baptisms: 0,
    conversions: 0,
    activeCells: 0,
  });

  const { toast } = useToast();
  const { user, viewingChurch } = useAuth();
  const canDownload = user?.role && !['aluno', 'membro', 'congregado'].includes(user.role);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    let attendanceDataFallback: any[] = [{ month: 'Sem dados', total: 0, adults: 0, youth: 0, children: 0 }];

    try {
      const finSummary = await financialService.getSummary();
      const rawTransactions = await financialService.getTransactionsForPeriod(6);
      const summaryList = Array.isArray(finSummary) ? finSummary : [];
      const txList = Array.isArray(rawTransactions) ? rawTransactions : [];

      const formatMonth = (yyyyMM: string) => {
        if (!yyyyMM) return '';
        const [year, month] = yyyyMM.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      };

      const processedFinData = summaryList.map((f: any) => {
        const monthTransactions = txList.filter((t: any) => t?.date?.startsWith?.(f?.month));
        const tithes = monthTransactions.filter((t: any) => t?.category === 'Dízimos').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
        const offerings = monthTransactions.filter((t: any) => t?.category?.includes?.('Ofertas')).reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
        return { month: formatMonth(f?.month ?? ''), rawMonth: f?.month ?? '', income: Number(f?.total_income) || 0, expenses: Number(f?.total_expenses) || 0, tithes, offerings };
      }).reverse();
      setFinancialData(processedFinData);

      const expenseMap = new Map<string, number>();
      txList.filter((t: any) => t?.type === 'saida').forEach((t: any) => {
        const cat = t?.category ?? 'Outros';
        expenseMap.set(cat, (expenseMap.get(cat) || 0) + (t?.amount ?? 0));
      });
      setExpenseCategories(Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    } catch (e) {
      console.error('Erro ao carregar dados financeiros:', e);
      setFinancialData([]);
      setExpenseCategories([]);
    }

    try {
      const [stats, activeCells, allReports] = await Promise.all([
        membersService.getStatistics().catch(() => null),
        cellsService.getActive().catch(() => []),
        cellsService.getAllReports().catch(() => []),
      ]);
      const reportsList = Array.isArray(allReports) ? allReports : [];
      const attendanceByMonthMap = new Map<string, { total: number; adults: number; youth: number; children: number; month: string; monthKey: string; visitantes: number; membrosPresentes: number }>();

      reportsList.forEach((report: any) => {
        const date = new Date(report?.date);
        if (isNaN(date.getTime())) return;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        const current = attendanceByMonthMap.get(monthKey) || { total: 0, adults: 0, youth: 0, children: 0, month: monthLabel, monthKey, visitantes: 0, membrosPresentes: 0 };
        const mp = report?.members_present ?? 0;
        const v = report?.visitors ?? 0;
        attendanceByMonthMap.set(monthKey, { ...current, total: current.total + mp + v, adults: current.adults + mp, month: monthLabel, monthKey, visitantes: current.visitantes + v, membrosPresentes: current.membrosPresentes + mp });
      });

      const attendanceData = Array.from(attendanceByMonthMap.values()).sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '')).slice(-6);
      attendanceDataFallback = attendanceData.length > 0 ? attendanceData : [{ month: 'Sem dados', total: 0, adults: 0, youth: 0, children: 0, monthKey: '', visitantes: 0, membrosPresentes: 0 }];

      setChurchHealthData({
        attendance: attendanceDataFallback,
        newMembers: (stats as any)?.total_members ?? 0,
        baptisms: (stats as any)?.baptized_members ?? 0,
        conversions: 0,
        activeCells: Array.isArray(activeCells) ? activeCells.length : 0,
      });
    } catch (e) {
      console.error('Erro ao carregar saúde da igreja:', e);
      setChurchHealthData({ attendance: attendanceDataFallback, newMembers: 0, baptisms: 0, conversions: 0, activeCells: 0 });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const fin = Array.isArray(financialData) ? financialData : [];
    const att = Array.isArray(churchHealthData?.attendance) ? churchHealthData.attendance : [];

    const allMonthKeys = Array.from(new Set([
      ...fin.map((f: any) => f?.rawMonth),
      ...att.map((a: any) => a?.monthKey)
    ])).filter(Boolean).sort();

    const merged = allMonthKeys.map((monthKey: string) => {
      const f = fin.find((x: any) => x?.rawMonth === monthKey) || {};
      const a = att.find((x: any) => x?.monthKey === monthKey) || {};

      return {
        month: f?.month || a?.month || monthKey,
        monthKey,
        frequencia: a?.total ?? 0,
        visitantes: a?.visitantes ?? 0,
        membrosPresentes: a?.membrosPresentes ?? 0,
        entradas: Number(f?.income) || 0,
        saidas: Number(f?.expenses) || 0,
      };
    });
    setEvolutionData(merged.length ? merged : []);
  }, [financialData, churchHealthData]);

  const totalIncome = (Array.isArray(financialData) ? financialData : []).reduce((sum, d) => sum + (Number(d?.income) || 0), 0);
  const totalExpenses = (Array.isArray(financialData) ? financialData : []).reduce((sum, d) => sum + (Number(d?.expenses) || 0), 0);
  const balance = totalIncome - totalExpenses;
  const safeExpense = Array.isArray(expenseCategories) ? expenseCategories : [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
    toast({
      title: 'Salvar como PDF',
      description: 'Na janela de impressão, escolha "Salvar como PDF" ou "Microsoft Print to PDF" como destino.',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 2cm;
          }
          body::after,
          body::before,
          #evolucao-print::after,
          #evolucao-print::before {
            content: none !important;
            display: none !important;
            visibility: hidden !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div id="evolucao-print" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Evolução da Igreja
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão consolidada do crescimento, saúde e desempenho financeiro
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {canDownload && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                  <Printer className="h-5 w-5" />
                  Imprimir
                </Button>
                <ExcelCompleteReportButton />
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                  <FileDown className="h-5 w-5" />
                  Baixar PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#6366f1] shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-[#6366f1]" />
                Total de Membros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#6366f1]">{churchHealthData?.newMembers ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#22c55e] shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#22c55e]" />
                Células Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#22c55e]">{churchHealthData?.activeCells ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#8b5cf6] shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-[#8b5cf6]" />
                Batismos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#8b5cf6]">{churchHealthData?.baptisms ?? 0}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#f59e0b] shadow-lg bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#f59e0b]" />
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                R$ {(balance / 1000).toFixed(0)}k
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico: Frequência e Visitantes */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#6366f1]" />
              Frequência e Visitantes nas Reuniões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value, '']} />
                  <Bar dataKey="membrosPresentes" name="Membros presentes" fill={COLORS[0]} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="visitantes" name="Visitantes" fill={COLORS[1]} radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico: Entradas e Saídas */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#22c55e]" />
              Evolução Financeira (Entradas x Saídas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.isArray(financialData) ? financialData : []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                  <Bar dataKey="income" name="Entradas" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Saídas" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Financeiro + Pizza de Despesas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Resumo Financeiro (período)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Entradas</span>
                <span className="font-bold text-[#22c55e]">R$ {totalIncome.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Saídas</span>
                <span className="font-bold text-[#ef4444]">R$ {totalExpenses.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Saldo</span>
                <span className={`font-bold ${balance >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  R$ {balance.toLocaleString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Maiores Despesas (categorias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeExpense.length > 0 ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={safeExpense.filter(e => e.value > 0).slice(0, 6)}
                        cx="40%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {safeExpense.filter(e => e.value > 0).slice(0, 6).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']} />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">Sem dados de despesas no período.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
