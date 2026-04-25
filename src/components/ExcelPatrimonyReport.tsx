import { useState } from 'react';
import { FileSpreadsheet, Loader2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { assetsService } from '@/services/assets.service';
import { churchesService } from '@/services/churches.service';
import { format, parseISO, addMonths, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores profissionais - Esquema Azul corporativo
const C = {
  PRIMARY: '1565C0',      // Azul principal
  PRIMARY_DARK: '0D47A1', // Azul escuro
  PRIMARY_LIGHT: 'E3F2FD', // Azul claro
  SECONDARY: '37474F',    // Cinza escuro
  ACCENT: 'FFC107',       // Amarelo dourado
  SUCCESS: '2E7D32',      // Verde
  WARNING: 'F57C00',      // Laranja
  DANGER: 'C62828',       // Vermelho
  WHITE: 'FFFFFF',
  GRAY_LIGHT: 'F5F5F5',
  GRAY: '9E9E9E',
  TEXT: '212121',
  TEXT_LIGHT: '757575',
  BORDER: 'E0E0E0'
};

// Estilos de células
const hStyle = (bg: string = C.PRIMARY) => ({
  font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: bg } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: bg } },
    bottom: { style: 'thin', color: { rgb: bg } },
    left: { style: 'thin', color: { rgb: bg } },
    right: { style: 'thin', color: { rgb: bg } }
  }
});

const hStyleLight = (bg: string = C.PRIMARY_LIGHT) => ({
  font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.PRIMARY_DARK } },
  fill: { patternType: 'solid', fgColor: { rgb: bg } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: C.BORDER } },
    bottom: { style: 'thin', color: { rgb: C.BORDER } },
    left: { style: 'thin', color: { rgb: C.BORDER } },
    right: { style: 'thin', color: { rgb: C.BORDER } }
  }
});

const cStyle = (center = false, bg = C.WHITE) => ({
  font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT } },
  fill: { patternType: 'solid', fgColor: { rgb: bg } },
  alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: C.BORDER } },
    bottom: { style: 'thin', color: { rgb: C.BORDER } },
    left: { style: 'thin', color: { rgb: C.BORDER } },
    right: { style: 'thin', color: { rgb: C.BORDER } }
  }
});

const tStyle = (c: string = C.PRIMARY) => ({
  font: { name: 'Arial', bold: true, sz: 18, color: { rgb: C.WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: c } },
  alignment: { horizontal: 'left', vertical: 'center' }
});

const sStyle = (c: string = C.PRIMARY_LIGHT) => ({
  font: { name: 'Arial', sz: 9, color: { rgb: C.TEXT_LIGHT }, italic: true },
  fill: { patternType: 'solid', fgColor: { rgb: c } },
  alignment: { horizontal: 'left', vertical: 'center' }
});

const currencyStyle = {
  font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT } },
  fill: { patternType: 'solid', fgColor: { rgb: C.WHITE } },
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '"R$"#,##0.00',
  border: {
    top: { style: 'thin', color: { rgb: C.BORDER } },
    bottom: { style: 'thin', color: { rgb: C.BORDER } },
    left: { style: 'thin', color: { rgb: C.BORDER } },
    right: { style: 'thin', color: { rgb: C.BORDER } }
  }
};

const percentStyle = {
  font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT } },
  fill: { patternType: 'solid', fgColor: { rgb: C.WHITE } },
  alignment: { horizontal: 'center', vertical: 'center' },
  numFmt: '0.00"%"',
  border: {
    top: { style: 'thin', color: { rgb: C.BORDER } },
    bottom: { style: 'thin', color: { rgb: C.BORDER } },
    left: { style: 'thin', color: { rgb: C.BORDER } },
    right: { style: 'thin', color: { rgb: C.BORDER } }
  }
};

// Helpers
const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'ativo': 'Ativo',
    'inativo': 'Inativo',
    'em_manutencao': 'Em Manutenção'
  };
  return map[status] || status;
};

const getSourceLabel = (source?: string) => {
  const map: Record<string, string> = {
    'compra': 'Compra',
    'doacao': 'Doação',
    'comodato': 'Comodato',
    'outro': 'Outro'
  };
  return map[source || ''] || source || '-';
};

const getDepreciationStatus = (asset: any) => {
  if (!asset.depreciationEnabled) return 'Não Calculada';
  if (!asset.acquisitionDate || !asset.usefulLifeYears) return 'Dados Incompletos';
  
  const acquisitionDate = parseISO(asset.acquisitionDate);
  const monthsPassed = differenceInMonths(new Date(), acquisitionDate);
  const totalMonths = asset.usefulLifeYears * 12;
  
  if (monthsPassed >= totalMonths) return 'Depreciado';
  return 'Em Depreciação';
};

const calculateDepreciatedValue = (asset: any) => {
  if (!asset.depreciationEnabled || !asset.value || !asset.acquisitionDate || !asset.usefulLifeYears) {
    return asset.value || 0;
  }
  
  const acquisitionDate = parseISO(asset.acquisitionDate);
  const monthsPassed = Math.max(0, differenceInMonths(new Date(), acquisitionDate));
  const totalMonths = asset.usefulLifeYears * 12;
  
  if (monthsPassed >= totalMonths) {
    return asset.residualValue || 0;
  }
  
  const depreciationRate = asset.depreciationRate || (100 / asset.usefulLifeYears);
  const annualDepreciation = (asset.value * depreciationRate) / 100;
  const monthlyDepreciation = annualDepreciation / 12;
  const totalDepreciation = monthlyDepreciation * monthsPassed;
  
  const depreciatedValue = asset.value - totalDepreciation;
  return Math.max(asset.residualValue || 0, depreciatedValue);
};

const calculateAccumulatedDepreciation = (asset: any) => {
  if (!asset.depreciationEnabled || !asset.value) return 0;
  return (asset.value || 0) - calculateDepreciatedValue(asset);
};

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    'ativo': C.SUCCESS,
    'inativo': C.GRAY,
    'em_manutencao': C.WARNING
  };
  return map[status] || C.GRAY;
};

const getMaintenanceStatus = (asset: any) => {
  if (!asset.maintenanceIntervalMonths || !asset.nextMaintenanceDate) return 'Não Programada';
  
  const nextDate = parseISO(asset.nextMaintenanceDate);
  const today = new Date();
  const daysDiff = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'Atrasada';
  if (daysDiff <= 7) return 'Próxima';
  if (daysDiff <= 30) return 'Em Breve';
  return 'Programada';
};

interface ExcelPatrimonyReportProps {
  disabled?: boolean;
  assets?: any[];
}

export function ExcelPatrimonyReportButton({ disabled, assets }: ExcelPatrimonyReportProps) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      // Buscar dados
      let assetsData = assets;
      if (!assetsData || assetsData.length === 0) {
        assetsData = await assetsService.getAssets(churchId);
      }

      if (!assetsData || assetsData.length === 0) {
        toast({ title: 'Nenhum dado', description: 'Não há bens patrimoniais para exportar.', variant: 'destructive' });
        return;
      }

      // Buscar informações da igreja
      let churchName = 'Igreja';
      let churchCNPJ = '';
      try {
        const churches = await churchesService.getAll();
        const currentChurch = churches.find((c: any) => c.id === (churchId || user?.churchId));
        if (currentChurch) {
          churchName = currentChurch.name || churchName;
          churchCNPJ = currentChurch.cnpj || '';
        }
      } catch (e) {
        // Ignora erro ao buscar igreja
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // === ABA 1: RESUMO GERAL ===
      const summaryRows: any[] = [];
      
      // Título
      summaryRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.PRIMARY) }, {}, {}, {}, {}, {}]);
      summaryRows.push([{ v: `CNPJ: ${churchCNPJ || 'N/A'}`, s: sStyle(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push([{ v: `RELATÓRIO COMPLETO DE PATRIMÔNIO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push(['']); // Linha vazia

      // Métricas principais
      const totalValue = assetsData.reduce((sum, a) => sum + (a.value || 0), 0);
      const depreciatedValue = assetsData.reduce((sum, a) => sum + calculateDepreciatedValue(a), 0);
      const accumulatedDepreciation = totalValue - depreciatedValue;
      const activeAssets = assetsData.filter(a => a.status === 'ativo').length;
      const maintenanceCount = assetsData.filter(a => a.status === 'em_manutencao').length;
      const depreciatingAssets = assetsData.filter(a => a.depreciationEnabled).length;

      summaryRows.push([{ v: 'INDICADORES PRINCIPAIS', s: hStyleLight(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push(['']);
      
      // Cards de métricas em formato de tabela
      summaryRows.push([
        { v: 'Total de Bens', s: hStyle(C.PRIMARY) },
        { v: 'Valor Original', s: hStyle(C.PRIMARY) },
        { v: 'Depreciação Acumulada', s: hStyle(C.WARNING) },
        { v: 'Valor Contábil', s: hStyle(C.SUCCESS) },
        { v: 'Bens Ativos', s: hStyle(C.SUCCESS) },
        { v: 'Em Manutenção', s: hStyle(C.ACCENT) }
      ]);
      
      summaryRows.push([
        { v: assetsData.length, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, sz: 14 } } },
        { v: totalValue, s: currencyStyle },
        { v: accumulatedDepreciation, s: currencyStyle },
        { v: depreciatedValue, s: currencyStyle },
        { v: activeAssets, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.SUCCESS } } } },
        { v: maintenanceCount, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.WARNING } } } }
      ]);
      
      summaryRows.push(['']);
      summaryRows.push(['']);

      // Distribuição por Categoria
      const categories = [...new Set(assetsData.map(a => a.category || 'Sem Categoria'))];
      const categoryData = categories.map(cat => {
        const items = assetsData.filter(a => (a.category || 'Sem Categoria') === cat);
        const value = items.reduce((sum, a) => sum + (a.value || 0), 0);
        return { category: cat, count: items.length, value };
      }).sort((a, b) => b.value - a.value);

      summaryRows.push([{ v: 'DISTRIBUIÇÃO POR CATEGORIA', s: hStyleLight(C.PRIMARY_LIGHT) }, {}, {}, {}]);
      summaryRows.push(['']);
      summaryRows.push([
        { v: 'Categoria', s: hStyle(C.PRIMARY_DARK) },
        { v: 'Quantidade', s: hStyle(C.PRIMARY_DARK) },
        { v: 'Valor Total', s: hStyle(C.PRIMARY_DARK) },
        { v: '% do Total', s: hStyle(C.PRIMARY_DARK) }
      ]);

      categoryData.forEach(cat => {
        const percentage = totalValue > 0 ? (cat.value / totalValue) * 100 : 0;
        summaryRows.push([
          { v: cat.category, s: cStyle() },
          { v: cat.count, s: cStyle(true) },
          { v: cat.value, s: currencyStyle },
          { v: percentage / 100, s: { ...percentStyle, numFmt: '0.00"%"' } }
        ]);
      });
      
      summaryRows.push(['']);
      summaryRows.push(['']);

      // Distribuição por Localização
      const locations = [...new Set(assetsData.map(a => a.location || 'Sem Localização'))];
      const locationData = locations.map(loc => {
        const items = assetsData.filter(a => (a.location || 'Sem Localização') === loc);
        const value = items.reduce((sum, a) => sum + (a.value || 0), 0);
        return { location: loc, count: items.length, value };
      }).sort((a, b) => b.value - a.value);

      summaryRows.push([{ v: 'DISTRIBUIÇÃO POR LOCALIZAÇÃO', s: hStyleLight(C.PRIMARY_LIGHT) }, {}, {}, {}]);
      summaryRows.push(['']);
      summaryRows.push([
        { v: 'Localização', s: hStyle(C.SECONDARY) },
        { v: 'Quantidade', s: hStyle(C.SECONDARY) },
        { v: 'Valor Total', s: hStyle(C.SECONDARY) },
        { v: '% do Total', s: hStyle(C.SECONDARY) }
      ]);

      locationData.forEach(loc => {
        const percentage = totalValue > 0 ? (loc.value / totalValue) * 100 : 0;
        summaryRows.push([
          { v: loc.location, s: cStyle() },
          { v: loc.count, s: cStyle(true) },
          { v: loc.value, s: currencyStyle },
          { v: percentage / 100, s: { ...percentStyle, numFmt: '0.00"%"' } }
        ]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
        { s: { r: 10, c: 0 }, e: { r: 10, c: 3 } },
        { s: { r: 17, c: 0 }, e: { r: 17, c: 3 } }
      ];
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

      // === ABA 2: DETALHAMENTO COMPLETO ===
      const detailRows: any[] = [];
      
      // Título
      detailRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.PRIMARY) }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
      detailRows.push([{ v: `RELATÓRIO DETALHADO DE PATRIMÔNIO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
      detailRows.push(['']);

      // Cabeçalhos
      detailRows.push([
        { v: 'CÓD.', s: hStyle(C.PRIMARY_DARK) },
        { v: 'NOME DO BEM', s: hStyle(C.PRIMARY_DARK) },
        { v: 'CATEGORIA', s: hStyle(C.PRIMARY_DARK) },
        { v: 'LOCALIZAÇÃO', s: hStyle(C.PRIMARY_DARK) },
        { v: 'STATUS', s: hStyle(C.PRIMARY_DARK) },
        { v: 'ORIGEM', s: hStyle(C.PRIMARY_DARK) },
        { v: 'DATA AQUISIÇÃO', s: hStyle(C.PRIMARY_DARK) },
        { v: 'VALOR ORIGINAL', s: hStyle(C.PRIMARY_DARK) },
        { v: 'DEPRECIAÇÃO', s: hStyle(C.WARNING) },
        { v: 'VIDA ÚTIL', s: hStyle(C.WARNING) },
        { v: 'VALOR RESIDUAL', s: hStyle(C.WARNING) },
        { v: 'VALOR CONTÁBIL', s: hStyle(C.SUCCESS) },
        { v: 'PRÓX. MANUTENÇÃO', s: hStyle(C.SECONDARY) }
      ]);

      // Dados
      assetsData.forEach((asset, index) => {
        const depreciatedValue = calculateDepreciatedValue(asset);
        const accumulatedDepreciation = calculateAccumulatedDepreciation(asset);
        const maintenanceStatus = getMaintenanceStatus(asset);
        
        // Cor de fundo alternada para melhor legibilidade
        const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
        
        detailRows.push([
          { v: index + 1, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true } } },
          { v: asset.name, s: cStyle(false, bgColor) },
          { v: asset.category || '-', s: cStyle(false, bgColor) },
          { v: asset.location || '-', s: cStyle(false, bgColor) },
          { v: getStatusLabel(asset.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(asset.status) }, bold: true } } },
          { v: getSourceLabel(asset.source), s: cStyle(true, bgColor) },
          { v: formatDate(asset.acquisitionDate), s: cStyle(true, bgColor) },
          { v: asset.value || 0, s: { ...currencyStyle, fill: { patternType: 'solid', fgColor: { rgb: bgColor } } } },
          { v: asset.depreciationEnabled ? `${asset.depreciationRate || (100 / (asset.usefulLifeYears || 1)).toFixed(2)}%` : 'N/A', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: asset.depreciationEnabled ? C.WARNING : C.GRAY } } } },
          { v: asset.usefulLifeYears ? `${asset.usefulLifeYears} anos` : '-', s: cStyle(true, bgColor) },
          { v: asset.residualValue || 0, s: { ...currencyStyle, fill: { patternType: 'solid', fgColor: { rgb: bgColor } } } },
          { v: depreciatedValue, s: { ...currencyStyle, font: { ...currencyStyle.font, bold: true }, fill: { patternType: 'solid', fgColor: { rgb: bgColor } } } },
          { v: formatDate(asset.nextMaintenanceDate), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: asset.nextMaintenanceDate ? C.PRIMARY : C.GRAY } } } }
        ]);
      });

      // Linha de totais
      detailRows.push(['']);
      detailRows.push([
        { v: 'TOTAL', s: hStyle(C.PRIMARY_DARK) },
        { v: `${assetsData.length} bens`, s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: totalValue, s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) },
        { v: assetsData.reduce((sum, a) => sum + (a.residualValue || 0), 0), s: hStyle(C.PRIMARY_DARK) },
        { v: depreciatedValue, s: hStyle(C.PRIMARY_DARK) },
        { v: '', s: hStyle(C.PRIMARY_DARK) }
      ]);

      const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetail['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }
      ];
      wsDetail['!cols'] = [
        { wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
        { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
        { wch: 14 }, { wch: 16 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhamento');

      // === ABA 3: CONTROLE DE DEPRECIAÇÃO ===
      const deprecRows: any[] = [];
      
      deprecRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.WARNING) }, {}, {}, {}, {}, {}, {}, {}, {}]);
      deprecRows.push([{ v: `CONTROLE DE DEPRECIAÇÃO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}, {}, {}, {}, {}, {}, {}]);
      deprecRows.push(['']);

      deprecRows.push([
        { v: 'CÓD.', s: hStyle(C.WARNING) },
        { v: 'NOME DO BEM', s: hStyle(C.WARNING) },
        { v: 'STATUS DEPRECIAÇÃO', s: hStyle(C.WARNING) },
        { v: 'DATA INÍCIO', s: hStyle(C.WARNING) },
        { v: 'MESES DECORRIDOS', s: hStyle(C.WARNING) },
        { v: 'MESES RESTANTES', s: hStyle(C.WARNING) },
        { v: 'TAXA ANUAL', s: hStyle(C.WARNING) },
        { v: 'DEPRECIAÇÃO ACUMULADA', s: hStyle(C.WARNING) },
        { v: 'VALOR CONTÁBIL', s: hStyle(C.SUCCESS) }
      ]);

      const depreciableAssets = assetsData.filter(a => a.depreciationEnabled);
      
      if (depreciableAssets.length === 0) {
        deprecRows.push([{ v: 'Nenhum bem com depreciação configurada', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}, {}, {}, {}, {}, {}]);
      } else {
        depreciableAssets.forEach((asset, index) => {
          const acquisitionDate = asset.acquisitionDate ? parseISO(asset.acquisitionDate) : null;
          const monthsPassed = acquisitionDate ? Math.max(0, differenceInMonths(new Date(), acquisitionDate)) : 0;
          const totalMonths = (asset.usefulLifeYears || 0) * 12;
          const monthsRemaining = Math.max(0, totalMonths - monthsPassed);
          const accumulatedDepreciation = calculateAccumulatedDepreciation(asset);
          const bookValue = calculateDepreciatedValue(asset);
          const depreciationRate = asset.depreciationRate || (asset.usefulLifeYears ? 100 / asset.usefulLifeYears : 0);
          
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          
          deprecRows.push([
            { v: index + 1, s: cStyle(true, bgColor) },
            { v: asset.name, s: cStyle(false, bgColor) },
            { v: monthsPassed >= totalMonths ? 'Depreciado' : 'Em Depreciação', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: monthsPassed >= totalMonths ? C.SUCCESS : C.WARNING }, bold: true } } },
            { v: formatDate(asset.acquisitionDate), s: cStyle(true, bgColor) },
            { v: monthsPassed, s: cStyle(true, bgColor) },
            { v: monthsRemaining, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: monthsRemaining <= 12 ? C.DANGER : C.TEXT } } } },
            { v: depreciationRate / 100, s: { ...percentStyle, fill: { patternType: 'solid', fgColor: { rgb: bgColor } } } },
            { v: accumulatedDepreciation, s: { ...currencyStyle, fill: { patternType: 'solid', fgColor: { rgb: bgColor } }, font: { ...currencyStyle.font, color: { rgb: C.WARNING } } } },
            { v: bookValue, s: { ...currencyStyle, font: { ...currencyStyle.font, bold: true }, fill: { patternType: 'solid', fgColor: { rgb: bgColor } } } }
          ]);
        });
      }

      const wsDeprec = XLSX.utils.aoa_to_sheet(deprecRows);
      wsDeprec['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
      ];
      wsDeprec['!cols'] = [
        { wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDeprec, 'Depreciação');

      // === ABA 4: MANUTENÇÕES PROGRAMADAS ===
      const maintRows: any[] = [];
      
      maintRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.SECONDARY) }, {}, {}, {}, {}, {}]);
      maintRows.push([{ v: `CONTROLE DE MANUTENÇÕES - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}, {}, {}, {}]);
      maintRows.push(['']);

      maintRows.push([
        { v: 'CÓD.', s: hStyle(C.SECONDARY) },
        { v: 'NOME DO BEM', s: hStyle(C.SECONDARY) },
        { v: 'LOCALIZAÇÃO', s: hStyle(C.SECONDARY) },
        { v: 'INTERVALO (MESES)', s: hStyle(C.SECONDARY) },
        { v: 'PRÓXIMA MANUTENÇÃO', s: hStyle(C.SECONDARY) },
        { v: 'STATUS', s: hStyle(C.SECONDARY) }
      ]);

      const scheduledMaintenanceAssets = assetsData.filter(a => a.maintenanceIntervalMonths && a.nextMaintenanceDate);
      
      if (scheduledMaintenanceAssets.length === 0) {
        maintRows.push([{ v: 'Nenhuma manutenção programada', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}, {}, {}]);
      } else {
        // Ordenar por data da próxima manutenção
        scheduledMaintenanceAssets.sort((a, b) => {
          const dateA = a.nextMaintenanceDate ? parseISO(a.nextMaintenanceDate).getTime() : 0;
          const dateB = b.nextMaintenanceDate ? parseISO(b.nextMaintenanceDate).getTime() : 0;
          return dateA - dateB;
        });

        scheduledMaintenanceAssets.forEach((asset, index) => {
          const maintStatus = getMaintenanceStatus(asset);
          const statusColor = maintStatus === 'Atrasada' ? C.DANGER : maintStatus === 'Próxima' ? C.WARNING : C.SUCCESS;
          
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          
          maintRows.push([
            { v: index + 1, s: cStyle(true, bgColor) },
            { v: asset.name, s: cStyle(false, bgColor) },
            { v: asset.location || '-', s: cStyle(false, bgColor) },
            { v: `${asset.maintenanceIntervalMonths} meses`, s: cStyle(true, bgColor) },
            { v: formatDate(asset.nextMaintenanceDate), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true } } },
            { v: maintStatus, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: statusColor }, bold: true } } }
          ]);
        });
      }

      const wsMaint = XLSX.utils.aoa_to_sheet(maintRows);
      wsMaint['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
      ];
      wsMaint['!cols'] = [
        { wch: 6 }, { wch: 35 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
      ];
      XLSX.utils.book_append_sheet(wb, wsMaint, 'Manutenções');

      // Download
      const fileName = `Relatorio_Patrimonio_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({ title: 'Relatório gerado!', description: `${fileName} foi baixado com sucesso.` });

    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast({ title: 'Erro ao gerar relatório', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleDownload} 
      disabled={loading || disabled}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      Relatório Excel
    </Button>
  );
}

export default ExcelPatrimonyReportButton;
