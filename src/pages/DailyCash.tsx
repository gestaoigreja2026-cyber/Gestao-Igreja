/* eslint-disable no-useless-escape */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Printer,
  FileDown,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Upload,
  FileText,
  CalendarCheck,
  Lock,
  Calendar,
  CheckSquare,
  Square,
  X,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_CHURCH_NAME, DEFAULT_CNPJ } from '@/lib/constants';
import { churchesService } from '@/services/churches.service';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { financialService, CreateFinancialTransactionDTO } from '@/services/financial.service';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ConfirmDialog } from '@/components/ConfirmDialog';
// Categorias para Entradas
const INCOME_CATEGORIES = [
  "Saldo Anterior",
  "Dízimos",
  "Ofertas - Culto Geral",
  "Ofertas - Missões",
  "Ofertas - Construção",
  "Ofertas - Escola Bíblica",
  "Vendas - Cantina",
  "Vendas - Livraria/Bazar",
  "Inscrições de Eventos",
  "Doações Especiais",
  "Aluguéis/Uso de Espaço",
  "Outras Entradas"
];

// Categorias para Saídas
const EXPENSE_CATEGORIES = [
  "Manutenção Predial",
  "Limpeza e Zeladoria",
  "Energia Elétrica",
  "Água e Esgoto",
  "Internet / Telefone",
  "Gás de Cozinha",
  "Ajuda Social / Cestas Básicas",
  "Ministério Infantil",
  "Ministério de Jovens",
  "Ministério de Louvor",
  "Escola Bíblica",
  "Eventos",
  "Missões e Evangelismo",
  "Material de Escritório",
  "Material de Limpeza",
  "Combustível / Transporte",
  "Honorários / Prebendas",
  "Outras Saídas"
];

const DailyCash = () => {
  useDocumentTitle('Caixa Diário');
  const queryClient = useQueryClient();
  const { user, viewingChurch } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [amountStr, setAmountStr] = useState('');
  const [newTransaction, setNewTransaction] = useState<Partial<CreateFinancialTransactionDTO>>({
    type: 'entrada',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    description: ''
  });
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedTransactions, setUploadedTransactions] = useState<any[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingMonth, setClosingMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialTransactionDTO) => {
      console.log('Dados:', data);
      console.log('ChurchId:', user?.churchId);
      if (!user?.churchId) throw new Error('Igreja não identificada.');
      return financialService.create(data, user.churchId);
    },
    onSuccess: (result) => {
      console.log('=== CREATE SUCCESS ===');
      console.log('Resultado:', result);
      queryClient.invalidateQueries({ queryKey: ['daily-cash'] });
      toast({ title: "Lançamento realizado", description: "O lançamento foi registrado com sucesso." });
      setIsAddModalOpen(false);
      setNewTransaction({
        type: 'entrada',
        date: selectedDate,
        amount: 0,
        category: '',
        description: ''
      });
      setAmountStr('');
    },
    onError: (error: any) => {
      console.error('=== CREATE ERROR ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error?.message);
      console.error('Detalhes:', error?.details);
      toast({ 
        title: "Erro ao salvar", 
        description: error?.message || "Erro ao realizar lançamento.", 
        variant: "destructive" 
      });
    }
  });
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['daily-cash', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const date = new Date(selectedDate + 'T12:00:00');
      if (isNaN(date.getTime())) return [];
      return await financialService.list(date, date);
    }
  });

  // Data for charts - Moved after transactions query
  const incomeData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'entrada').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const expenseData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'saida').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financialService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-cash'] });
      toast({ title: "Lançamento removido", description: "O lançamento foi excluído com sucesso." });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro", description: "Erro ao excluir lançamento.", variant: "destructive" });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => financialService.delete(id))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      return { succeeded, failed, total: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-cash'] });
      setSelectedTransactions(new Set());
      if (data.failed > 0) {
        toast({ 
          title: "Exclusão parcial", 
          description: `${data.succeeded} removidos, ${data.failed} falhas.`,
          variant: "default"
        });
      } else {
        toast({ 
          title: "Lançamentos removidos", 
          description: `${data.succeeded} lançamentos excluídos com sucesso.` 
        });
      }
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Erro", description: "Erro ao excluir lançamentos.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: CreateFinancialTransactionDTO }) => financialService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-cash'] });
      toast({ title: "Lançamento atualizado", description: "As alterações foram salvas com sucesso." });
      setIsAddModalOpen(false);
      setEditingTransaction(null);
    },
    onError: (error: any) => {
      console.error(error);
      toast({ title: "Erro", description: error.message || "Erro ao atualizar lançamento.", variant: "destructive" });
    }
  });

  const totals = transactions.reduce(
    (acc, curr) => {
      if (curr.type === 'entrada') {
        acc.income += curr.amount;
      } else {
        acc.expense += curr.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      // Buscar informações da igreja
      let churchName = viewingChurch?.name || DEFAULT_CHURCH_NAME;
      let churchCNPJ = DEFAULT_CNPJ;
      
      if (user?.churchId) {
        try {
          const church = await churchesService.getById(user.churchId);
          if (church?.name) churchName = church.name;
          // Se houver CNPJ no banco, usar; senão usar o padrão
          if ((church as any)?.cnpj) churchCNPJ = (church as any).cnpj;
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      const formattedDate = format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      const exportDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Criar HTML formatado para Excel
      let htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Caixa Diário</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo/>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  .header {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    padding: 10px;
    background-color: #4A5568;
    color: white;
  }
  .church-info {
    font-size: 14px;
    text-align: center;
    padding: 5px;
    background-color: #E2E8F0;
  }
  .summary-row {
    font-weight: bold;
    background-color: #F7FAFC;
  }
  .entrada {
    background-color: #C6F6D5;
    color: #22543D;
    font-weight: bold;
  }
  .saida {
    background-color: #FED7D7;
    color: #742A2A;
    font-weight: bold;
  }
  .saldo-positivo {
    background-color: #BEE3F8;
    color: #2C5282;
    font-weight: bold;
  }
  .saldo-negativo {
    background-color: #FED7D7;
    color: #742A2A;
    font-weight: bold;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-family: Arial, sans-serif;
  }
  th {
    background-color: #4A5568;
    color: white;
    font-weight: bold;
    padding: 10px;
    border: 1px solid #2D3748;
    text-align: left;
  }
  td {
    padding: 8px;
    border: 1px solid #CBD5E0;
  }
  .valor-entrada {
    color: #22543D;
    font-weight: bold;
  }
  .valor-saida {
    color: #742A2A;
    font-weight: bold;
  }
</style>
</head>
<body>
  <table>
    <tr>
      <td colspan="6" class="header">RELATÓRIO DE CAIXA DIÁRIO</td>
    </tr>
    <tr>
      <td colspan="6" class="church-info">
        <strong>Logo da Igreja:</strong> ${churchName}<br>
        <strong>Igreja:</strong> ${churchName}<br>
        <strong>CNPJ:</strong> ${churchCNPJ}<br>
        <strong>Data do Relatório:</strong> ${formattedDate}<br>
        <strong>Gerado em:</strong> ${exportDate}
      </td>
    </tr>
    <tr>
      <td colspan="6" style="height: 10px;"></td>
    </tr>
    <tr>
      <th>Horário</th>
      <th>Descrição</th>
      <th>Categoria</th>
      <th>Tipo</th>
      <th style="text-align: right;">Valor</th>
      <th style="text-align: right;">Saldo Acumulado</th>
    </tr>`;

      let runningBalance = 0;
      transactions.forEach((transaction) => {
        const isEntrada = transaction.type === 'entrada';
        runningBalance += isEntrada ? transaction.amount : -transaction.amount;
        
        const timeStr = transaction.created_at 
          ? format(new Date(transaction.created_at), 'HH:mm')
          : '--:--';
        
        const rowClass = isEntrada ? 'entrada' : 'saida';
        const valorClass = isEntrada ? 'valor-entrada' : 'valor-saida';
        const valorPrefix = isEntrada ? '+' : '-';
        const saldoClass = runningBalance >= 0 ? 'saldo-positivo' : 'saldo-negativo';

        const valorFormatado = formatCurrency(transaction.amount);
        const saldoFormatado = formatCurrency(runningBalance);
        
        htmlContent += `
    <tr class="${rowClass}">
      <td>${timeStr}</td>
      <td>${(transaction.description || 'Sem descrição').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
      <td>${transaction.category.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
      <td>${isEntrada ? 'Entrada' : 'Saída'}</td>
      <td style="text-align: right;" class="${valorClass}">${valorPrefix}${valorFormatado}</td>
      <td style="text-align: right;" class="${saldoClass}">${saldoFormatado}</td>
    </tr>`;
      });

      // Linha de totais
      const totalEntradasFormatado = formatCurrency(totals.income);
      const totalSaidasFormatado = formatCurrency(totals.expense);
      const saldoFormatado = formatCurrency(balance);
      const saldoColor = balance >= 0 ? '#2C5282' : '#742A2A';
      
      htmlContent += `
    <tr class="summary-row">
      <td colspan="4" style="text-align: right; font-weight: bold;">TOTAIS:</td>
      <td colspan="2" style="text-align: right;">
        <span style="color: #22543D; font-weight: bold;">Entradas: ${totalEntradasFormatado}</span><br>
        <span style="color: #742A2A; font-weight: bold;">Saídas: ${totalSaidasFormatado}</span><br>
        <span style="color: ${saldoColor}; font-weight: bold;">Saldo do Dia: ${saldoFormatado}</span>
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Criar blob com codificação UTF-8 (adicionar BOM para Excel reconhecer corretamente)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `caixa_diario_${selectedDate.replace(/-/g, '_')}.xls`;
      link.href = url;
      link.download = fileName;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório Exportado",
        description: `O arquivo ${fileName} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');

    if (numericValue === '') {
      setAmountStr('');
      setNewTransaction({ ...newTransaction, amount: 0 });
      return;
    }

    const floatValue = parseFloat(numericValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(floatValue);

    setAmountStr(formatted);
    setNewTransaction({ ...newTransaction, amount: floatValue });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== HANDLE SUBMIT ===');
    console.log('newTransaction:', newTransaction);
    console.log('user:', user);
    console.log('churchId:', user?.churchId);
    
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      console.log('Erro: Valor inválido');
      toast({ title: "Valor inválido", description: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    if (!newTransaction.category) {
      console.log('Erro: Categoria faltando');
      toast({ title: "Categoria faltando", description: "Informe uma categoria.", variant: "destructive" });
      return;
    }
    if (!user?.churchId) {
      console.log('Erro: ChurchId não encontrado');
      toast({ title: "Erro", description: "Igreja não identificada. Faça login novamente.", variant: "destructive" });
      return;
    }

    console.log('Dados validados, chamando mutation...');
    if (editingTransaction) {
      updateMutation.mutate({
        id: editingTransaction.id,
        data: newTransaction as CreateFinancialTransactionDTO
      });
    } else {
      createMutation.mutate(newTransaction as CreateFinancialTransactionDTO);
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description
    });
    setAmountStr(formatCurrency(transaction.amount));
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => setDeleteConfirm(id);
  const executeDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllTransactions = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const executeDeleteMultiple = () => {
    if (selectedTransactions.size > 0) {
      deleteMultipleMutation.mutate(Array.from(selectedTransactions));
      setDeleteMultipleConfirm(false);
    }
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
  };

  // Parse OFX - Universal para qualquer banco
  const parseOFX = (content: string): any[] => {
    const transactions: any[] = [];
    
    console.log('[OFX Parser] Iniciando, tamanho:', content.length);
    console.log('[OFX] Preview:', content.substring(0, 300).replace(/\n/g, ' '));
    
    // Estratégia 1: Procurar blocos <STMTTRN> padrão
    const stmtTrnBlocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || [];
    
    for (const block of stmtTrnBlocks) {
      // Extrair campos de forma flexível - aceita com ou sem > no fechamento
      const trnType = (block.match(/<TRNTYPE>\s*([^<\s]+)/i)?.[1] || '').trim();
      let dateStr = (block.match(/<DTPOSTED>\s*([^<\s]+)/i)?.[1] || '').trim();
      const amountStr = (block.match(/<TRNAMT>\s*([^<\s]+)/i)?.[1] || '0').trim();
      const memo = (block.match(/<MEMO>([^]*?)<\/[A-Z]+>/i)?.[1] || '').replace(/<[A-Z]+>/gi, ' ').trim();
      const name = (block.match(/<NAME>([^]*?)<\/[A-Z]+>/i)?.[1] || '').replace(/<[A-Z]+>/gi, ' ').trim();
      
      // Alternativas de data
      if (!dateStr) dateStr = (block.match(/<DTUSER>\s*([^<\s]+)/i)?.[1] || '').trim();
      if (!dateStr) dateStr = (block.match(/<DTAVAIL>\s*([^<\s]+)/i)?.[1] || '').trim();
      
      const amount = parseFloat(amountStr.replace(',', '.')) || 0;
      
      // Formatar data
      let formattedDate = '';
      if (dateStr.length >= 8) {
        const cleanDate = dateStr.substring(0, 8);
        if (/^\d{8}$/.test(cleanDate)) {
          formattedDate = `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
        }
      }
      
      // Determinar tipo
      let type: 'entrada' | 'saida' = amount >= 0 ? 'entrada' : 'saida';
      const trnUpper = trnType.toUpperCase();
      if (trnUpper.includes('DEBIT') || trnUpper.includes('PAYMENT') || trnUpper.includes('CHECK')) type = 'saida';
      if (trnUpper.includes('CREDIT') || trnUpper.includes('DEP')) type = 'entrada';
      
      if (amount !== 0) {
        transactions.push({
          date: formattedDate || selectedDate,
          amount: Math.abs(amount),
          type,
          description: name || memo || 'Movimentação',
          category: ''
        });
      }
    }
    
    // Estratégia 2: Se não achou nada, tentar parsing genérico por tags
    if (transactions.length === 0) {
      // Procurar por qualquer tag que tenha data, valor e descrição
      const allDates = [...content.matchAll(/<(DTPOSTED|DTUSER|DTAVAIL|DATE)>\s*(\d{8})/gi)];
      const allAmounts = [...content.matchAll(/<TRNAMT>\s*(-?\d+[.,]?\d*)/gi)];
      const allMemos = [...content.matchAll(/<(MEMO|NAME|DESC)>\s*([^<]+)/gi)];
      
      for (let i = 0; i < Math.min(allDates.length, allAmounts.length); i++) {
        const dateMatch = allDates[i];
        const amountMatch = allAmounts[i];
        const memoMatch = allMemos[i] || { 2: 'Movimentação' };
        
        if (dateMatch && amountMatch) {
          const dateStr = dateMatch[2];
          const amount = parseFloat(amountMatch[1].replace(',', '.')) || 0;
          
          transactions.push({
            date: `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'entrada' : 'saida',
            description: memoMatch[2]?.trim() || 'Movimentação',
            category: ''
          });
        }
      }
    }
    
    console.log(`[OFX] Total: ${transactions.length} transações`);
    return transactions;
  };

  // Parse CSV - Universal para qualquer banco
  const parseCSV = (content: string): any[] => {
    console.log('[CSV Parser] Iniciando, tamanho:', content.length);
    console.log('[CSV] Preview:', content.split('\n').slice(0, 3));
    
    // Remover BOM e normalizar quebras de linha
    const cleanContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('[CSV] Arquivo vazio');
      return [];
    }
    
    const transactions: any[] = [];
    
    // Detectar delimitador
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    console.log('[CSV] Delimitador:', delimiter);
    
    // Detectar se primeira linha é cabeçalho
    const headerLine = firstLine.toUpperCase();
    const hasHeader = headerLine.includes('DATA') || headerLine.includes('DATE') || 
                      headerLine.includes('LANÇAMENTO') || headerLine.includes('DESCRIÇÃO') ||
                      headerLine.includes('VALOR') || headerLine.includes('HISTÓRICO');
    
    const startLine = hasHeader ? 1 : 0;
    console.log('[CSV] Tem cabeçalho:', hasHeader, '- Iniciando na linha:', startLine);
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('TOTAL') || line.startsWith('SALDO')) continue;
      
      const parts = line.split(delimiter).map(p => p.trim().replace(/"/g, ''));
      if (parts.length < 2) continue;
      
      let date = '';
      let description = '';
      let amount = 0;
      let type: 'entrada' | 'saida' = 'saida';
      
      try {
        // Estratégia universal: procurar por padrões em todas as colunas
        for (let j = 0; j < parts.length; j++) {
          const val = parts[j];
          if (!val) continue;
          
          // Procurar data (DD/MM/AAAA ou AAAA-MM-DD)
          const dateMatch1 = val.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
          const dateMatch2 = val.match(/(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})/);
          
          if (dateMatch1 && !date) {
            const [, d, m, y] = dateMatch1;
            const year = y.length === 2 ? `20${y}` : y;
            date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else if (dateMatch2 && !date) {
            const [, y, m, d] = dateMatch2;
            date = `${y}-${m}-${d}`;
          }
          
          // Procurar valor (número com vírgula ou ponto)
          const valClean = val.replace(/[^\d.,\-]/g, '');
          if (valClean && /\d/.test(valClean)) {
            const valNum = parseFloat(valClean.replace(/\./g, '').replace(',', '.'));
            if (!isNaN(valNum) && valNum !== 0 && amount === 0) {
              amount = Math.abs(valNum);
              // Determinar se é negativo
              const isNegative = val.includes('-') || 
                                val.includes('D') || // Débito
                                val.includes('C') === false && valNum < 0;
              type = isNegative ? 'saida' : 'entrada';
            }
          }
          
          // Procurar descrição (texto significativo que não é data nem número puro)
          if (val.length > 3 && 
              !val.match(/^\d{1,2}[\/\-\.]\d{1,2}/) && // não é data
              !val.replace(/[^\d.,\-]/g, '').match(/^-?[\d.,]+$/) && // não é número puro
              !['DATA', 'HORA', 'TIPO', 'VALOR'].includes(val.toUpperCase())) {
            if (!description || description.length < val.length) {
              description = val;
            }
          }
        }
        
        // Se não achou descrição, usar a primeira coluna que não seja data
        if (!description) {
          for (let j = 0; j < parts.length; j++) {
            const val = parts[j];
            if (val && !val.match(/^\d{1,2}[\/\-\.]\d{1,2}/)) {
              description = val;
              break;
            }
          }
        }
        
        description = description || 'Movimentação';
        
        // Validar e adicionar
        if (amount > 0) {
          transactions.push({
            date: date || selectedDate,
            amount,
            type,
            description: description.length > 100 ? description.substring(0, 100) + '...' : description,
            category: ''
          });
          console.log(`[CSV] Transação ${transactions.length}:`, { date: date || selectedDate, amount, type, description: description.substring(0, 30) });
        }
        
      } catch (err) {
        console.error(`[CSV] Erro linha ${i}:`, err);
      }
    }
    
    console.log(`[CSV] Total: ${transactions.length} transações`);
    return transactions;
  };

  // Categorize transaction based on description
  const categorizeTransaction = (description: string, type: 'entrada' | 'saida'): string => {
    const desc = description.toLowerCase();
    
    if (type === 'entrada') {
      if (desc.includes('dizimo') || desc.includes('dízimo')) return 'Dízimos';
      if (desc.includes('oferta') && desc.includes('missão')) return 'Ofertas - Missões';
      if (desc.includes('oferta') && desc.includes('construção')) return 'Ofertas - Construção';
      if (desc.includes('oferta') && desc.includes('escola')) return 'Ofertas - Escola Bíblica';
      if (desc.includes('oferta')) return 'Ofertas - Culto Geral';
      if (desc.includes('venda') || desc.includes('cantina')) return 'Vendas - Cantina';
      if (desc.includes('doação') || desc.includes('doacao')) return 'Doações Especiais';
      if (desc.includes('aluguel')) return 'Aluguéis/Uso de Espaço';
      if (desc.includes('inscrição') || desc.includes('inscricao')) return 'Inscrições de Eventos';
      return 'Outras Entradas';
    } else {
      if (desc.includes('energia') || desc.includes('eletricidade') || desc.includes('cemig') || desc.includes('light')) return 'Energia Elétrica';
      if (desc.includes('água') || desc.includes('agua') || desc.includes('sabesp') || desc.includes('copasa')) return 'Água e Esgoto';
      if (desc.includes('internet') || desc.includes('telefone') || desc.includes('net') || desc.includes('vivo') || desc.includes('claro') || desc.includes('oi ') || desc.includes('tim')) return 'Internet / Telefone';
      if (desc.includes('gás') || desc.includes('gas') || desc.includes('liquigás') || desc.includes('ultragaz')) return 'Gás de Cozinha';
      if (desc.includes('manutenção') || desc.includes('manutencao') || desc.includes('reparo')) return 'Manutenção Predial';
      if (desc.includes('limpeza') || desc.includes('zeladoria')) return 'Limpeza e Zeladoria';
      if (desc.includes('cesta') || desc.includes('ajuda') || desc.includes('social')) return 'Ajuda Social / Cestas Básicas';
      if (desc.includes('infantil') || desc.includes('criança')) return 'Ministério Infantil';
      if (desc.includes('jovens') || desc.includes('mocidade')) return 'Ministério de Jovens';
      if (desc.includes('louvor') || desc.includes('música') || desc.includes('musica') || desc.includes('banda')) return 'Ministério de Louvor';
      if (desc.includes('escola bíblica') || desc.includes('ebd') || desc.includes('dominical')) return 'Escola Bíblica';
      if (desc.includes('evento') || desc.includes('congresso') || desc.includes('conferência')) return 'Eventos';
      if (desc.includes('missão') || desc.includes('missionário') || desc.includes('evangelismo')) return 'Missões e Evangelismo';
      if (desc.includes('escritório') || desc.includes('papelaria') || desc.includes('material')) return 'Material de Escritório';
      if (desc.includes('combustível') || desc.includes('gasolina') || desc.includes('diesel') || desc.includes('transporte')) return 'Combustível / Transporte';
      if (desc.includes('honorário') || desc.includes('prebenda') || desc.includes('pastor') || desc.includes('salário')) return 'Honorários / Prebendas';
      return 'Outras Saídas';
    }
  };

  // Decode file content with proper encoding detection
  const decodeFileContent = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Try UTF-8 first
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      const utf8Text = utf8Decoder.decode(bytes);
      // Check if decoded content looks valid (no replacement characters)
      if (!utf8Text.includes('\uFFFD')) {
        return utf8Text;
      }
    } catch (e) {
      // UTF-8 decoding failed, try other encodings
    }
    
    // Try Windows-1252 (Latin1) - common for Brazilian bank OFX files
    try {
      const latin1Decoder = new TextDecoder('windows-1252', { fatal: false });
      return latin1Decoder.decode(bytes);
    } catch (e) {
      // Fall back to ISO-8859-1
    }
    
    // Fallback to ISO-8859-1
    const isoDecoder = new TextDecoder('iso-8859-1', { fatal: false });
    return isoDecoder.decode(bytes);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is PDF - block with clear message
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      toast({ 
        title: 'Formato PDF não suportado', 
        description: 'Extratos em PDF não podem ser lidos automaticamente. Por favor, baixe o extrato em formato OFX ou CSV diretamente do seu banco. A maioria dos bancos oferece essa opção no Internet Banking.', 
        variant: 'destructive' 
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setIsProcessingFile(true);
    
    try {
      const content = await decodeFileContent(file);
      let parsed: any[] = [];
      
      if (file.name.toLowerCase().endsWith('.ofx') || content.includes('OFXHEADER')) {
        parsed = parseOFX(content);
      } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
        parsed = parseCSV(content);
      } else {
        // Try OFX first, then CSV
        parsed = parseOFX(content);
        if (parsed.length === 0) {
          parsed = parseCSV(content);
        }
      }
      
      if (parsed.length === 0) {
        // Mostrar preview do conteúdo para debug
        const contentPreview = content.substring(0, 500).replace(/\n/g, ' ');
        console.log('[Upload] Conteúdo do arquivo (primeiros 500 chars):', contentPreview);
        console.log('[Upload] Extensão:', file.name.toLowerCase());
        console.log('[Upload] Tamanho:', content.length, 'bytes');
        
        toast({ 
          title: 'Formato não reconhecido', 
          description: `Não foi possível extrair transações. Verifique se o arquivo está no formato correto (OFX/CSV). Verifique o console (F12) para mais detalhes.`, 
          variant: 'destructive',
          duration: 8000
        });
        return;
      }
      
      // Categorize all transactions
      const categorized = parsed.map(t => ({
        ...t,
        category: categorizeTransaction(t.description, t.type)
      }));
      
      setUploadedTransactions(categorized);
      setIsUploadModalOpen(true);
      
      toast({ title: 'Sucesso', description: `${categorized.length} transações importadas do extrato.` });
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      toast({ 
        title: 'Erro ao processar arquivo', 
        description: error?.message || 'Ocorreu um erro ao ler o arquivo. Verifique se o formato está correto (OFX, CSV ou TXT) e tente novamente.', 
        variant: 'destructive',
        duration: 8000
      });
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importTransactions = async () => {
    if (!user?.churchId) {
      toast({ title: 'Erro', description: 'Igreja não identificada.', variant: 'destructive' });
      return;
    }
    
    let imported = 0;
    let errors = 0;
    const datesImported = new Set<string>();
    
    for (const transaction of uploadedTransactions) {
      try {
        await financialService.create({
          type: transaction.type,
          date: transaction.date,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description
        }, user.churchId);
        imported++;
        if (transaction.date) datesImported.add(transaction.date);
      } catch (error) {
        console.error('Erro ao importar transação:', error);
        errors++;
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['daily-cash'] });
    setIsUploadModalOpen(false);
    setUploadedTransactions([]);
    
    // Mostrar datas importadas
    const datesArray = Array.from(datesImported).sort();
    const datesText = datesArray.length > 3 
      ? `${datesArray.slice(0, 3).join(', ')} e ${datesArray.length - 3} outras datas`
      : datesArray.join(', ');
    
    if (errors > 0) {
      toast({ 
        title: 'Importação parcial', 
        description: `${imported} importadas, ${errors} erros. Verifique as datas: ${datesText}`, 
        variant: 'default',
        duration: 8000
      });
    } else {
      toast({ 
        title: 'Sucesso', 
        description: `${imported} transações importadas para as datas: ${datesText}. Use o calendário acima para visualizá-las.`, 
        duration: 8000
      });
    }
  };

  const removeUploadedTransaction = (index: number) => {
    setUploadedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const updateUploadedTransaction = (index: number, field: string, value: any) => {
    setUploadedTransactions(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  // Gerar relatório mensal de fechamento
  const handleGenerateMonthlyReport = async () => {
    if (!user?.churchId) {
      toast({ title: 'Erro', description: 'Igreja não identificada.', variant: 'destructive' });
      return;
    }

    setIsGeneratingReport(true);

    try {
      // Buscar informações da igreja
      let churchName = viewingChurch?.name || DEFAULT_CHURCH_NAME;
      let churchCNPJ = DEFAULT_CNPJ;
      
      if (user?.churchId) {
        try {
          const church = await churchesService.getById(user.churchId);
          if (church?.name) churchName = church.name;
          if ((church as any)?.cnpj) churchCNPJ = (church as any).cnpj;
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      // Calcular período do mês
      const [year, month] = closingMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      const monthName = format(startDate, "MMMM 'de' yyyy", { locale: ptBR });
      const reportDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Buscar transações do período
      const monthTransactions = await financialService.list(startDate, endDate);
      
      // Separar entradas e saídas
      const entradas = monthTransactions.filter(t => t.type === 'entrada');
      const saidas = monthTransactions.filter(t => t.type === 'saida');
      
      // Calcular totais por categoria
      const entradasByCategory: Record<string, number> = {};
      const saidasByCategory: Record<string, number> = {};
      
      entradas.forEach(t => {
        entradasByCategory[t.category] = (entradasByCategory[t.category] || 0) + t.amount;
      });
      
      saidas.forEach(t => {
        saidasByCategory[t.category] = (saidasByCategory[t.category] || 0) + t.amount;
      });

      const totalEntradas = entradas.reduce((sum, t) => sum + t.amount, 0);
      const totalSaidas = saidas.reduce((sum, t) => sum + t.amount, 0);
      const saldo = totalEntradas - totalSaidas;

      // Criar HTML formatado para Excel
      let htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Fechamento Mensal</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo/>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  .header { font-size: 20px; font-weight: bold; text-align: center; padding: 15px; background-color: #4A5568; color: white; }
  .church-info { font-size: 12px; text-align: center; padding: 10px; background-color: #E2E8F0; }
  .section-title { font-size: 14px; font-weight: bold; text-align: center; padding: 10px; background-color: #4A5568; color: white; margin-top: 20px; }
  .totals-row { font-weight: bold; background-color: #F7FAFC; font-size: 14px; }
  .saldo-positivo { background-color: #C6F6D5; color: #22543D; font-weight: bold; }
  .saldo-negativo { background-color: #FED7D7; color: #742A2A; font-weight: bold; }
  table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
  th { background-color: #4A5568; color: white; font-weight: bold; padding: 8px; border: 1px solid #2D3748; text-align: left; }
  td { padding: 6px; border: 1px solid #CBD5E0; }
  .entrada-valor { color: #22543D; font-weight: bold; text-align: right; }
  .saida-valor { color: #742A2A; font-weight: bold; text-align: right; }
  .numero { text-align: right; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="4" class="header">RELATÓRIO DE FECHAMENTO MENSAL</td></tr>
    <tr>
      <td colspan="4" class="church-info">
        <strong>Igreja:</strong> ${churchName}<br>
        <strong>CNPJ:</strong> ${churchCNPJ}<br>
        <strong>Período:</strong> ${monthName}<br>
        <strong>Gerado em:</strong> ${reportDate}
      </td>
    </tr>
    <tr><td colspan="4" style="height: 15px;"></td></tr>
    
    <!-- RESUMO GERAL -->
    <tr><td colspan="4" class="section-title">RESUMO GERAL</td></tr>
    <tr>
      <th colspan="2">Descrição</th>
      <th colspan="2" style="text-align: right;">Valor</th>
    </tr>
    <tr>
      <td colspan="2"><strong>TOTAL DE ENTRADAS</strong></td>
      <td colspan="2" class="entrada-valor">${formatCurrency(totalEntradas)}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>TOTAL DE SAÍDAS</strong></td>
      <td colspan="2" class="saida-valor">${formatCurrency(totalSaidas)}</td>
    </tr>
    <tr class="${saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo'}">
      <td colspan="2"><strong>SALDO DO MÊS</strong></td>
      <td colspan="2" class="numero">${formatCurrency(saldo)}</td>
    </tr>
    
    <!-- ENTRADAS POR CATEGORIA -->
    <tr><td colspan="4" class="section-title">ENTRADAS POR CATEGORIA</td></tr>
    <tr>
      <th>Categoria</th>
      <th colspan="2">Quantidade</th>
      <th style="text-align: right;">Valor Total</th>
    </tr>`;

      // Adicionar entradas por categoria
      const entradaCategories = Object.entries(entradasByCategory).sort((a, b) => b[1] - a[1]);
      if (entradaCategories.length === 0) {
        htmlContent += `<tr><td colspan="4" style="text-align: center; color: #666;">Nenhuma entrada registrada no período</td></tr>`;
      } else {
        entradaCategories.forEach(([category, value]) => {
          const count = entradas.filter(t => t.category === category).length;
          htmlContent += `
    <tr>
      <td>${category}</td>
      <td colspan="2" class="numero">${count} lançamento(s)</td>
      <td class="entrada-valor">${formatCurrency(value)}</td>
    </tr>`;
        });
      }
      
      htmlContent += `
    <tr class="totals-row">
      <td colspan="3" style="text-align: right;"><strong>TOTAL DE ENTRADAS</strong></td>
      <td class="entrada-valor">${formatCurrency(totalEntradas)}</td>
    </tr>`;

      // SAÍDAS POR CATEGORIA
      htmlContent += `
    <!-- SAÍDAS POR CATEGORIA -->
    <tr><td colspan="4" class="section-title">SAÍDAS POR CATEGORIA</td></tr>
    <tr>
      <th>Categoria</th>
      <th colspan="2">Quantidade</th>
      <th style="text-align: right;">Valor Total</th>
    </tr>`;

      const saidaCategories = Object.entries(saidasByCategory).sort((a, b) => b[1] - a[1]);
      if (saidaCategories.length === 0) {
        htmlContent += `<tr><td colspan="4" style="text-align: center; color: #666;">Nenhuma saída registrada no período</td></tr>`;
      } else {
        saidaCategories.forEach(([category, value]) => {
          const count = saidas.filter(t => t.category === category).length;
          htmlContent += `
    <tr>
      <td>${category}</td>
      <td colspan="2" class="numero">${count} lançamento(s)</td>
      <td class="saida-valor">${formatCurrency(value)}</td>
    </tr>`;
        });
      }
      
      htmlContent += `
    <tr class="totals-row">
      <td colspan="3" style="text-align: right;"><strong>TOTAL DE SAÍDAS</strong></td>
      <td class="saida-valor">${formatCurrency(totalSaidas)}</td>
    </tr>`;

      // DETALHAMENTO DE TODAS AS TRANSAÇÕES
      htmlContent += `
    <!-- DETALHAMENTO DE TRANSAÇÕES -->
    <tr><td colspan="4" class="section-title">DETALHAMENTO DE TODAS AS TRANSAÇÕES</td></tr>
    <tr>
      <th>Data</th>
      <th>Tipo</th>
      <th>Categoria</th>
      <th style="text-align: right;">Valor</th>
    </tr>`;

      // Ordenar transações por data
      const sortedTransactions = [...monthTransactions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (sortedTransactions.length === 0) {
        htmlContent += `<tr><td colspan="4" style="text-align: center; color: #666;">Nenhuma transação no período</td></tr>`;
      } else {
        sortedTransactions.forEach(t => {
          const dateStr = format(new Date(t.date), 'dd/MM/yyyy');
          const isEntrada = t.type === 'entrada';
          htmlContent += `
    <tr>
      <td>${dateStr}</td>
      <td>${isEntrada ? 'Entrada' : 'Saída'}</td>
      <td>${t.category}${t.description ? ` - ${t.description}` : ''}</td>
      <td class="${isEntrada ? 'entrada-valor' : 'saida-valor'}">${formatCurrency(t.amount)}</td>
    </tr>`;
        });
      }

      // Rodapé
      htmlContent += `
    <tr><td colspan="4" style="height: 20px;"></td></tr>
    <tr>
      <td colspan="4" style="text-align: center; font-size: 10px; color: #666; padding: 10px;">
        Este relatório foi gerado automaticamente pelo sistema de gestão da igreja.<br>
        Documento válido para fins de prestação de contas e análise financeira.
      </td>
    </tr>
  </table>
</body>
</html>`;

      // Criar blob com codificação UTF-8 (adicionar BOM para Excel reconhecer corretamente)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `fechamento_mensal_${closingMonth}.xls`;
      link.href = url;
      link.download = fileName;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Relatório Gerado',
        description: `Fechamento mensal de ${monthName} exportado com sucesso!`,
      });
      
      setIsClosingModalOpen(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({ title: 'Erro', description: 'Erro ao gerar relatório mensal.', variant: 'destructive' });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const currentCategories = newTransaction.type === 'entrada'
    ? INCOME_CATEGORIES
    : EXPENSE_CATEGORIES;

  if (isLoading) {
    return (
      <div key="loading-state" className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <span>Erro ao carregar dados do caixa. Verifique as permissões.</span>
      </div>
    );
  }

  return (
    <div key="daily-cash-content" className="container mx-auto p-4 space-y-6 print:p-0 print:max-w-none" translate="no" >
      <ConfirmDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)} title="Excluir lançamento" description="Tem certeza que deseja excluir este lançamento?" onConfirm={executeDelete} confirmLabel="Excluir" variant="destructive" />
      <ConfirmDialog 
        open={deleteMultipleConfirm} 
        onOpenChange={(o) => !o && setDeleteMultipleConfirm(false)} 
        title="Excluir múltiplos lançamentos" 
        description={`Tem certeza que deseja excluir ${selectedTransactions.size} lançamentos selecionados?`} 
        onConfirm={executeDeleteMultiple} 
        confirmLabel="Excluir" 
        variant="destructive" 
      />
      {/* Header & Controls - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div translate="no">
          <h1 className="text-3xl font-bold tracking-tight"><span>Caixa Diário</span></h1>
          <p className="text-muted-foreground">
            <span>Gerenciamento de entradas e saídas do dia</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48 w-full">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".ofx,.csv,.txt"
              className="hidden" 
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()} 
              title="Importar Extrato Bancário (OFX/CSV)"
              disabled={isProcessingFile}
            >
              {isProcessingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsClosingModalOpen(true)} 
              title="Fechamento Mensal"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <CalendarCheck className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handlePrint}
              title="Relatório de Transparência (PDF/Imprimir)"
            >
              <Printer className="h-4 w-4" />
            </Button>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Novo Lançamento</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-screen h-screen sm:w-[95vw] sm:max-w-lg sm:h-auto sm:max-h-[90vh] overflow-visible p-5 sm:p-6 rounded-xl">
                <DialogHeader>
                  <DialogTitle><span>{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</span></DialogTitle>
                  <DialogDescription>
                    <span>{editingTransaction ? 'Atualize os dados do lançamento.' : 'Adicione uma entrada ou saída no caixa.'}</span>
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4" translate="no">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label><span>Tipo</span></Label>
                      <Select
                        value={newTransaction.type}
                        onValueChange={(val: 'entrada' | 'saida') => {
                          console.log('Tipo alterado para:', val);
                          setNewTransaction({
                            ...newTransaction,
                            type: val,
                            category: '' // Reset category when type changes
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent 
                          className="z-[99999] min-w-[200px]"
                          side="bottom"
                          sideOffset={4}
                          avoidCollisions={true}
                        >
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label><span>Data</span></Label>
                      <Input
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label><span>Valor *</span></Label>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={amountStr}
                      onChange={handleAmountChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label><span>Categoria *</span></Label>
                    <Select
                      value={newTransaction.category || undefined}
                      onValueChange={(val) => {
                        console.log('Categoria selecionada:', val);
                        setNewTransaction({ ...newTransaction, category: val });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma categoria..." />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[300px] overflow-y-auto z-[99999] min-w-[200px]"
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={true}
                      >
                        {currentCategories.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            Nenhuma categoria disponível - Selecione Entrada ou Saída primeiro
                          </SelectItem>
                        ) : (
                          currentCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {currentCategories.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        Selecione um tipo (Entrada ou Saída) primeiro
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><span>Descrição (Opcional)</span></Label>
                    <Textarea
                      placeholder="Detalhes sobre o lançamento..."
                      value={newTransaction.description || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingTransaction(null);
                    }}><span>Cancelar</span></Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      onClick={(e) => {
                        console.log('=== BOTÃO SALVAR CLICADO ===');
                        console.log('newTransaction:', newTransaction);
                        console.log('amountStr:', amountStr);
                      }}
                    >
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <span>{editingTransaction ? 'Salvar Alterações' : 'Salvar'}</span>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimir">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportExcel} title="Exportar Excel com Cores">
              <FileDown className="h-4 w-4" />
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".ofx,.csv,.txt"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Print Header - Visible only on Print */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-2xl font-bold"><span>Relatório de Caixa Diário</span></h1>
        <p className="text-gray-600">
          <span>Data: {format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </p>
      </div>

      {/* Gráficos de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:hidden">
        <Card className="bg-white border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-primary/5 border-b border-primary/5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
              <PieChartIcon className="h-4 w-4" />
              Origem das Entradas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[200px] w-full">
              {incomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {incomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
                  Nenhuma entrada registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-red-500/5 border-b border-red-500/5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-red-600">
              <BarChartIcon className="h-4 w-4" />
              Maiores Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[200px] w-full">
              {expenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
                  Nenhuma saída registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3" translate="no">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <span>Total Entradas</span>
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <span>{formatCurrency(totals.income)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <span>Total Saídas</span>
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <span>{formatCurrency(totals.expense)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <span>Saldo do Dia</span>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              balance >= 0 ? "text-blue-600" : "text-red-600"
            )}>
              <span>{formatCurrency(balance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden flex flex-row items-center justify-between">
          <CardTitle><span>Transações</span></CardTitle>
          {transactions.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedTransactions.size > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedTransactions.size} selecionado(s)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-8 gap-1 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteMultipleConfirm(true)}
                    disabled={deleteMultipleMutation.isPending}
                    className="h-8 gap-1"
                  >
                    {deleteMultipleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent className="print:p-0">
          {transactions.length === 0 ? (
            <div className="print:hidden">
              <EmptyState
                icon={DollarSign}
                title="Nenhuma transação nesta data"
                description="Adicione uma entrada ou saída usando o botão acima."
              />
            </div>
          ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader translate="no">
              <TableRow>
                <TableHead className="w-10 print:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleAllTransactions}
                    className="h-8 w-8"
                  >
                    {selectedTransactions.size === transactions.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-20"><span>Horário</span></TableHead>
                <TableHead className="min-w-[150px]"><span>Descrição</span></TableHead>
                <TableHead className="min-w-[140px]"><span>Categoria</span></TableHead>
                <TableHead className="w-24"><span>Tipo</span></TableHead>
                <TableHead className="text-right w-28"><span>Valor</span></TableHead>
                <TableHead className="text-right print:hidden w-24"><span>Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className={selectedTransactions.has(transaction.id) ? "bg-primary/5" : ""}
                  >
                    <TableCell className="print:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleTransactionSelection(transaction.id)}
                        className="h-8 w-8"
                      >
                        {selectedTransactions.has(transaction.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span>
                        {(() => {
                          try {
                            return transaction.created_at ? format(new Date(transaction.created_at), 'HH:mm') : '--:--';
                          } catch (e) {
                            console.error('Error formatting date:', transaction.created_at);
                            return '--:--';
                          }
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span>{transaction.description || 'Sem descrição'}</span>
                    </TableCell>
                    <TableCell><span>{transaction.category}</span></TableCell>
                    <TableCell>
                      <Badge
                        variant={transaction.type === 'entrada' ? 'default' : 'destructive'}
                        className={cn(
                          transaction.type === 'entrada'
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-red-100 text-red-800 hover:bg-red-100",
                          "print:border print:border-gray-300"
                        )}
                      >
                        <span>{transaction.type === 'entrada' ? 'Entrada' : 'Saída'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      transaction.type === 'entrada' ? "text-green-600" : "text-red-600"
                    )}>
                      <span>{transaction.type === 'entrada' ? '+' : '-'}</span>
                      <span>{formatCurrency(transaction.amount)}</span>
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(transaction)} 
                          className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 shrink-0"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(transaction.id)} 
                          className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50 shrink-0"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal - Preview imported transactions */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="w-screen h-screen sm:w-[95vw] sm:max-w-4xl sm:h-auto sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Importar Extrato Bancário</span>
            </DialogTitle>
            <DialogDescription>
              <span>Revise as transações antes de importar. Edite a categoria ou remova itens indesejados.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {uploadedTransactions.length} transação(ões) encontrada(s)
              </p>
              {uploadedTransactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedTransactions([])}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar Todos
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedTransactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="date"
                          value={transaction.date}
                          onChange={(e) => updateUploadedTransaction(index, 'date', e.target.value)}
                          className="w-32 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={transaction.description}
                          onChange={(e) => {
                            updateUploadedTransaction(index, 'description', e.target.value);
                            updateUploadedTransaction(index, 'category', categorizeTransaction(e.target.value, transaction.type));
                          }}
                          className="w-48 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaction.type}
                          onValueChange={(val: 'entrada' | 'saida') => {
                            updateUploadedTransaction(index, 'type', val);
                            updateUploadedTransaction(index, 'category', categorizeTransaction(transaction.description, val));
                          }}
                        >
                          <SelectTrigger className="w-24 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entrada">Entrada</SelectItem>
                            <SelectItem value="saida">Saída</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaction.category || undefined}
                          onValueChange={(val) => updateUploadedTransaction(index, 'category', val)}
                        >
                          <SelectTrigger className="w-48 text-sm">
                            <SelectValue placeholder="Categoria..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {(transaction.type === 'entrada' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        transaction.type === 'entrada' ? "text-green-600" : "text-red-600"
                      )}>
                        <Input
                          type="text"
                          value={new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(transaction.amount)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            const floatValue = parseFloat(value) / 100;
                            updateUploadedTransaction(index, 'amount', floatValue);
                          }}
                          className="w-28 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeUploadedTransaction(index)}
                          className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setIsUploadModalOpen(false);
              setUploadedTransactions([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={importTransactions} disabled={uploadedTransactions.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Importar {uploadedTransactions.length} Transação(ões)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly Closing Modal */}
      <Dialog open={isClosingModalOpen} onOpenChange={setIsClosingModalOpen}>
        <DialogContent className="w-screen h-screen sm:w-[95vw] sm:max-w-lg sm:h-auto sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span>Fechamento Mensal</span>
            </DialogTitle>
            <DialogDescription>
              <span>Gere o relatório de fechamento mensal com todas as transações do período selecionado.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Selecione o Mês para Fechamento
              </Label>
              <Input
                type="month"
                value={closingMonth}
                onChange={(e) => setClosingMonth(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                O relatório incluirá todas as transações de {format(new Date(closingMonth + '-01'), "MMMM 'de' yyyy", { locale: ptBR })}.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-xl space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                O que está incluso no relatório:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Resumo geral (Total de Entradas, Saídas e Saldo)</li>
                <li>Entradas agrupadas por categoria</li>
                <li>Saídas agrupadas por categoria</li>
                <li>Detalhamento de todas as transações do mês</li>
                <li>Formatação profissional para Excel</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsClosingModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateMonthlyReport} 
              disabled={isGeneratingReport}
              className="gap-2"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Gerar Relatório Mensal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { margin: 2cm; }
          /* Ensure the content takes full width */
          .container {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DailyCash;
