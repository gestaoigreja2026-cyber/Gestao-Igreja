import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { churchesService } from '@/services/churches.service';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores profissionais - Esquema Verde (Consolidação/Novos Convertidos)
const C = {
  PRIMARY: '2E7D32',      // Verde principal
  PRIMARY_DARK: '1B5E20', // Verde escuro
  PRIMARY_LIGHT: 'E8F5E9', // Verde claro
  SECONDARY: '1565C0',    // Azul
  ACCENT: 'FF9800',       // Laranja
  SUCCESS: '4CAF50',      // Verde sucesso
  WARNING: 'FFC107',      // Amarelo
  DANGER: 'F44336',       // Vermelho
  INFO: '2196F3',         // Azul info
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
  font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.WHITE } },
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

// Helpers
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
    'novo': 'Novo',
    'em_acompanhamento': 'Em Acompanhamento',
    'consolidado': 'Consolidado',
    'desistente': 'Desistente'
  };
  return map[status] || status;
};

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    'novo': C.INFO,
    'em_acompanhamento': C.WARNING,
    'consolidado': C.SUCCESS,
    'desistente': C.DANGER
  };
  return map[status] || C.GRAY;
};

const isWeekCompleted = (convertido: any, week: number) => {
  switch (week) {
    case 1: return !!(convertido.week1Contact && convertido.week1Date);
    case 2: return !!(convertido.week2InviteCell && convertido.week2Date);
    case 3: return !!(convertido.week3InviteCult && convertido.week3Date);
    case 4: return !!(convertido.week4HomeVisit && convertido.week4Date);
    default: return false;
  }
};

const getProgress = (convertido: any) => {
  let completed = 0;
  if (convertido.week1Contact || convertido.week1Date) completed++;
  if (convertido.week2InviteCell || convertido.week2Date) completed++;
  if (convertido.week3InviteCult || convertido.week3Date) completed++;
  if (convertido.week4HomeVisit || convertido.week4Date) completed++;
  return completed;
};

interface ExcelConsolidacaoReportProps {
  disabled?: boolean;
  convertidos?: any[];
}

export function ExcelConsolidacaoReportButton({ disabled, convertidos }: ExcelConsolidacaoReportProps) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      if (!convertidos || convertidos.length === 0) {
        toast({ title: 'Nenhum dado', description: 'Não há novos convertidos para exportar.', variant: 'destructive' });
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
      summaryRows.push([{ v: `RELATÓRIO DE CONSOLIDAÇÃO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push(['']);

      // Métricas principais
      const totalConvertidos = convertidos.length;
      const novos = convertidos.filter(c => c.status === 'novo').length;
      const emAcompanhamento = convertidos.filter(c => c.status === 'em_acompanhamento').length;
      const consolidados = convertidos.filter(c => c.status === 'consolidado').length;
      const desistentes = convertidos.filter(c => c.status === 'desistente').length;
      const comBatismo = convertidos.filter(c => c.baptismDate).length;

      summaryRows.push([{ v: 'INDICADORES PRINCIPAIS', s: hStyleLight(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push(['']);
      
      summaryRows.push([
        { v: 'Total Convertidos', s: hStyle(C.PRIMARY) },
        { v: 'Novos', s: hStyle(C.INFO) },
        { v: 'Em Acompanhamento', s: hStyle(C.WARNING) },
        { v: 'Consolidados', s: hStyle(C.SUCCESS) },
        { v: 'Desistentes', s: hStyle(C.DANGER) },
        { v: 'Batizados', s: hStyle(C.SECONDARY) }
      ]);
      
      summaryRows.push([
        { v: totalConvertidos, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, sz: 14 } } },
        { v: novos, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.INFO } } } },
        { v: emAcompanhamento, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.WARNING } } } },
        { v: consolidados, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.SUCCESS } } } },
        { v: desistentes, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.DANGER } } } },
        { v: comBatismo, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.SECONDARY } } } }
      ]);
      
      summaryRows.push(['']);
      summaryRows.push(['']);

      // Progresso por Semana
      const semana1 = convertidos.filter(c => isWeekCompleted(c, 1)).length;
      const semana2 = convertidos.filter(c => isWeekCompleted(c, 2)).length;
      const semana3 = convertidos.filter(c => isWeekCompleted(c, 3)).length;
      const semana4 = convertidos.filter(c => isWeekCompleted(c, 4)).length;

      summaryRows.push([{ v: 'ACOMPANHAMENTO POR SEMANA', s: hStyleLight(C.PRIMARY_LIGHT) }, {}, {}, {}, {}, {}]);
      summaryRows.push(['']);
      
      summaryRows.push([
        { v: '1ª Semana\nContato Telefônico', s: hStyle(C.PRIMARY_DARK) },
        { v: '2ª Semana\nConvite Célula', s: hStyle(C.PRIMARY_DARK) },
        { v: '3ª Semana\nConvite Culto', s: hStyle(C.PRIMARY_DARK) },
        { v: '4ª Semana\nVisita no Lar', s: hStyle(C.PRIMARY_DARK) },
        { v: 'Taxa de\nConsolidação', s: hStyle(C.SUCCESS) }
      ]);
      
      const taxaConsolidacao = totalConvertidos > 0 ? ((consolidados / totalConvertidos) * 100).toFixed(1) : '0.0';
      
      summaryRows.push([
        { v: semana1, s: cStyle(true) },
        { v: semana2, s: cStyle(true) },
        { v: semana3, s: cStyle(true) },
        { v: semana4, s: cStyle(true) },
        { v: `${taxaConsolidacao}%`, s: { ...cStyle(true), font: { ...cStyle(true).font, bold: true, color: { rgb: C.SUCCESS } } } }
      ]);

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
        { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } }
      ];
      wsSummary['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

      // === ABA 2: DETALHAMENTO COMPLETO ===
      const detailRows: any[] = [];
      
      detailRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.PRIMARY) }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
      detailRows.push([{ v: `RELATÓRIO DETALHADO DE CONSOLIDAÇÃO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
      detailRows.push(['']);

      // Cabeçalhos
      detailRows.push([
        { v: 'CÓD.', s: hStyle(C.PRIMARY_DARK) },
        { v: 'NOME', s: hStyle(C.PRIMARY_DARK) },
        { v: 'TELEFONE', s: hStyle(C.PRIMARY_DARK) },
        { v: 'STATUS', s: hStyle(C.PRIMARY_DARK) },
        { v: 'VISITA\nINICIAL', s: hStyle(C.SECONDARY) },
        { v: 'CULTO', s: hStyle(C.SECONDARY) },
        { v: '1ª SEMANA\nCONTATO', s: hStyle(C.INFO) },
        { v: 'DATA 1ª', s: hStyle(C.INFO) },
        { v: '2ª SEMANA\nCÉLULA', s: hStyle(C.WARNING) },
        { v: 'DATA 2ª', s: hStyle(C.WARNING) },
        { v: '3ª SEMANA\nCULTO', s: hStyle(C.ACCENT) },
        { v: 'DATA 3ª', s: hStyle(C.ACCENT) },
        { v: '4ª SEMANA\nLAR', s: hStyle(C.PRIMARY) },
        { v: 'DATA 4ª', s: hStyle(C.PRIMARY) },
        { v: 'BATISMO', s: hStyle(C.SUCCESS) }
      ]);

      // Dados
      convertidos.forEach((c, index) => {
        const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
        
        detailRows.push([
          { v: index + 1, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true } } },
          { v: c.name, s: cStyle(false, bgColor) },
          { v: c.phone || '-', s: cStyle(false, bgColor) },
          { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) }, bold: true } } },
          { v: c.visitDay || '-', s: cStyle(false, bgColor) },
          { v: c.visitService || '-', s: cStyle(false, bgColor) },
          { v: c.week1Contact ? 'Sim' : '-', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: c.week1Contact ? C.SUCCESS : C.GRAY } } } },
          { v: formatDate(c.week1Date), s: cStyle(true, bgColor) },
          { v: c.week2InviteCell ? 'Sim' : '-', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: c.week2InviteCell ? C.SUCCESS : C.GRAY } } } },
          { v: formatDate(c.week2Date), s: cStyle(true, bgColor) },
          { v: c.week3InviteCult ? 'Sim' : '-', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: c.week3InviteCult ? C.SUCCESS : C.GRAY } } } },
          { v: formatDate(c.week3Date), s: cStyle(true, bgColor) },
          { v: c.week4HomeVisit ? 'Sim' : '-', s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: c.week4HomeVisit ? C.SUCCESS : C.GRAY } } } },
          { v: formatDate(c.week4Date), s: cStyle(true, bgColor) },
          { v: formatDate(c.baptismDate), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true, color: { rgb: c.baptismDate ? C.SUCCESS : C.GRAY } } } }
        ]);
      });

      const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetail['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }
      ];
      wsDetail['!cols'] = [
        { wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
        { wch: 10 }, { wch: 14 }, { wch: 11 }, { wch: 14 }, { wch: 11 },
        { wch: 14 }, { wch: 11 }, { wch: 14 }, { wch: 11 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhamento');

      // === ABA 3: OBSERVAÇÕES DETALHADAS ===
      const obsRows: any[] = [];
      
      obsRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.PRIMARY) }, {}, {}, {}, {}]);
      obsRows.push([{ v: `OBSERVAÇÕES DETALHADAS - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}, {}, {}]);
      obsRows.push(['']);

      obsRows.push([
        { v: 'CÓD.', s: hStyle(C.PRIMARY_DARK) },
        { v: 'NOME', s: hStyle(C.PRIMARY_DARK) },
        { v: 'STATUS', s: hStyle(C.PRIMARY_DARK) },
        { v: 'PROGRESSO', s: hStyle(C.SECONDARY) },
        { v: 'OBSERVAÇÕES', s: hStyle(C.SECONDARY) }
      ]);

      convertidos.forEach((c, index) => {
        const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
        const progress = getProgress(c);
        const progressText = `${progress}/4 semanas`;
        
        obsRows.push([
          { v: index + 1, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true } } },
          { v: c.name, s: cStyle(false, bgColor) },
          { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) } } } },
          { v: progressText, s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: progress === 4 ? C.SUCCESS : progress >= 2 ? C.WARNING : C.GRAY } } } },
          { v: c.observations || '-', s: cStyle(false, bgColor) }
        ]);
      });

      const wsObs = XLSX.utils.aoa_to_sheet(obsRows);
      wsObs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
      ];
      wsObs['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsObs, 'Observações');

      // === ABA 4: ACOMPANHAMENTO SEMANAL ===
      const weeklyRows: any[] = [];
      
      weeklyRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.PRIMARY) }, {}, {}, {}]);
      weeklyRows.push([{ v: `ACOMPANHAMENTO SEMANAL DETALHADO - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}, {}]);
      weeklyRows.push(['']);

      // Semana 2 (Exibida como 1ª)
      weeklyRows.push([{ v: '1ª SEMANA - CONVITE PARA CÉLULA', s: hStyleLight(C.INFO) }, {}, {}, {}]);
      weeklyRows.push(['']);
      weeklyRows.push([
        { v: 'NOME', s: hStyle(C.INFO) },
        { v: 'CONVITE REALIZADO', s: hStyle(C.INFO) },
        { v: 'DATA', s: hStyle(C.INFO) },
        { v: 'STATUS', s: hStyle(C.INFO) }
      ]);

      const week2List = convertidos.filter(c => c.week2InviteCell || c.week2Date);
      if (week2List.length === 0) {
        weeklyRows.push([{ v: 'Nenhum registro para esta etapa', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}]);
      } else {
        week2List.forEach((c, index) => {
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          weeklyRows.push([
            { v: c.name, s: cStyle(false, bgColor) },
            { v: c.week2InviteCell, s: cStyle(false, bgColor) },
            { v: formatDate(c.week2Date), s: cStyle(true, bgColor) },
            { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) } } } }
          ]);
        });
      }
      
      weeklyRows.push(['']);
      weeklyRows.push(['']);

      // Semana 1 (Exibida como 2ª)
      weeklyRows.push([{ v: '2ª SEMANA - CONTATO TELEFÔNICO/VISITA', s: hStyleLight(C.INFO) }, {}, {}, {}]);
      weeklyRows.push(['']);
      weeklyRows.push([
        { v: 'NOME', s: hStyle(C.INFO) },
        { v: 'CONTATO REALIZADO', s: hStyle(C.INFO) },
        { v: 'DATA', s: hStyle(C.INFO) },
        { v: 'STATUS', s: hStyle(C.INFO) }
      ]);

      const week1List = convertidos.filter(c => c.week1Contact || c.week1Date);
      if (week1List.length === 0) {
        weeklyRows.push([{ v: 'Nenhum registro para esta etapa', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}]);
      } else {
        week1List.forEach((c, index) => {
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          weeklyRows.push([
            { v: c.name, s: cStyle(false, bgColor) },
            { v: c.week1Contact, s: cStyle(false, bgColor) },
            { v: formatDate(c.week1Date), s: cStyle(true, bgColor) },
            { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) } } } }
          ]);
        });
      }
      
      weeklyRows.push(['']);
      weeklyRows.push(['']);

      // Semana 3
      weeklyRows.push([{ v: '3ª SEMANA - CONVITE PARA CULTO', s: hStyleLight(C.INFO) }, {}, {}, {}]);
      weeklyRows.push(['']);
      weeklyRows.push([
        { v: 'NOME', s: hStyle(C.INFO) },
        { v: 'CONVITE REALIZADO', s: hStyle(C.INFO) },
        { v: 'DATA', s: hStyle(C.INFO) },
        { v: 'STATUS', s: hStyle(C.INFO) }
      ]);

      const week3List = convertidos.filter(c => c.week3InviteCult || c.week3Date);
      if (week3List.length === 0) {
        weeklyRows.push([{ v: 'Nenhum registro para esta etapa', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}]);
      } else {
        week3List.forEach((c, index) => {
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          weeklyRows.push([
            { v: c.name, s: cStyle(false, bgColor) },
            { v: c.week3InviteCult, s: cStyle(false, bgColor) },
            { v: formatDate(c.week3Date), s: cStyle(true, bgColor) },
            { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) } } } }
          ]);
        });
      }
      
      weeklyRows.push(['']);
      weeklyRows.push(['']);

      // Semana 4
      weeklyRows.push([{ v: '4ª SEMANA - VISITA NO LAR', s: hStyleLight(C.PRIMARY) }, {}, {}, {}]);
      weeklyRows.push(['']);
      weeklyRows.push([
        { v: 'NOME', s: hStyle(C.PRIMARY) },
        { v: 'VISITA REALIZADA', s: hStyle(C.PRIMARY) },
        { v: 'DATA', s: hStyle(C.PRIMARY) },
        { v: 'STATUS', s: hStyle(C.PRIMARY) }
      ]);

      const week4List = convertidos.filter(c => c.week4HomeVisit || c.week4Date);
      if (week4List.length === 0) {
        weeklyRows.push([{ v: 'Nenhum registro para esta etapa', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}, {}]);
      } else {
        week4List.forEach((c, index) => {
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          weeklyRows.push([
            { v: c.name, s: cStyle(false, bgColor) },
            { v: c.week4HomeVisit, s: cStyle(false, bgColor) },
            { v: formatDate(c.week4Date), s: cStyle(true, bgColor) },
            { v: getStatusLabel(c.status), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, color: { rgb: getStatusColor(c.status) } } } }
          ]);
        });
      }

      const wsWeekly = XLSX.utils.aoa_to_sheet(weeklyRows);
      
      // Cálculo dinâmico de merges para garantir que todos os títulos ocupem colunas A-D
      const merges: any[] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Título Igreja
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }  // Subtítulo Relatório
      ];

      let currentRow = 3; // Início após título/espaço
      
      // Merge Semana 2 (que agora é a 1ª na lista)
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
      const week2Rows = Math.max(convertidos.filter(c => c.week2InviteCell || c.week2Date).length, 1);
      currentRow += 5 + week2Rows;

      // Merge Semana 1 (que agora é a 2ª na lista)
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
      const week1RowsCount = Math.max(convertidos.filter(c => c.week1Contact || c.week1Date).length, 1);
      currentRow += 5 + week1RowsCount;

      // Merge Semana 3
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
      const week3RowsCount = Math.max(convertidos.filter(c => c.week3InviteCult || c.week3Date).length, 1);
      currentRow += 5 + week3RowsCount;

      // Merge Semana 4
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });

      wsWeekly['!merges'] = merges;
      wsWeekly['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsWeekly, 'Acompanhamento Semanal');

      // === ABA 5: BATIZADOS ===
      const baptRows: any[] = [];
      
      baptRows.push([{ v: churchName.toUpperCase(), s: tStyle(C.SUCCESS) }, {}, {}]);
      baptRows.push([{ v: `RELATÓRIO DE BATIZADOS - ${format(new Date(), 'dd/MM/yyyy')}`, s: sStyle() }, {}, {}]);
      baptRows.push(['']);

      baptRows.push([
        { v: 'NOME', s: hStyle(C.SUCCESS) },
        { v: 'DATA DO BATISMO', s: hStyle(C.SUCCESS) },
        { v: 'TELEFONE', s: hStyle(C.SUCCESS) }
      ]);

      const batizados = convertidos.filter(c => c.baptismDate);
      
      if (batizados.length === 0) {
        baptRows.push([{ v: 'Nenhum convertido batizado registrado', s: { ...cStyle(), font: { ...cStyle().font, italic: true, color: { rgb: C.GRAY } } } }, {}, {}]);
      } else {
        batizados.sort((a, b) => {
          const dateA = a.baptismDate ? parseISO(a.baptismDate).getTime() : 0;
          const dateB = b.baptismDate ? parseISO(b.baptismDate).getTime() : 0;
          return dateA - dateB;
        });
        
        batizados.forEach((c, index) => {
          const bgColor = index % 2 === 0 ? C.WHITE : C.GRAY_LIGHT;
          baptRows.push([
            { v: c.name, s: cStyle(false, bgColor) },
            { v: formatDate(c.baptismDate), s: { ...cStyle(true, bgColor), font: { ...cStyle(true, bgColor).font, bold: true } } },
            { v: c.phone || '-', s: cStyle(false, bgColor) }
          ]);
        });
      }

      const wsBapt = XLSX.utils.aoa_to_sheet(baptRows);
      wsBapt['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }
      ];
      wsBapt['!cols'] = [{ wch: 35 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsBapt, 'Batizados');

      // Download
      const fileName = `Relatorio_Consolidacao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
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

export default ExcelConsolidacaoReportButton;
