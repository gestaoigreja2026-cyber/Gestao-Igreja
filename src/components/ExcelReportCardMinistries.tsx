import { FileSpreadsheet, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { churchesService } from '@/services/churches.service';

// ============================================
// ESTILOS ELEGANTES DE EXCEL COM CORES
// ============================================
const STYLES = {
  // Cabeçalho azul vibrante com bordas
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    fill: { fgColor: { rgb: '2563EB' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '1E40AF' } },
      bottom: { style: 'medium', color: { rgb: '1E40AF' } },
      left: { style: 'thin', color: { rgb: '3B82F6' } },
      right: { style: 'thin', color: { rgb: '3B82F6' } }
    }
  },
  // Título gradiente azul (simulado)
  title: {
    font: { bold: true, color: { rgb: '1E40AF' }, sz: 20, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'EFF6FF' }, patternType: 'solid' }
  },
  // Subtítulo elegante
  subtitle: {
    font: { color: { rgb: '64748B' }, sz: 11, name: 'Calibri', italic: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' }
  },
  // Células normais
  cell: {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    },
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } }
  },
  // Linha zebrada (cinza claro)
  cellAlt: {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    },
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' }
  },
  // Números
  integer: {
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: '0',
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    },
    font: { sz: 10, name: 'Calibri', color: { rgb: '0F172A' } }
  },
  // Números zebrados
  integerAlt: {
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: '0',
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    },
    font: { sz: 10, name: 'Calibri', color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' }
  },
  // Data
  date: {
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: 'DD/MM/YYYY',
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  // Status Ativo verde vibrante
  statusActive: {
    font: { bold: true, color: { rgb: '15803D' }, sz: 10 },
    fill: { fgColor: { rgb: 'DCFCE7' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '86EFAC' } },
      bottom: { style: 'thin', color: { rgb: '86EFAC' } },
      left: { style: 'thin', color: { rgb: '86EFAC' } },
      right: { style: 'thin', color: { rgb: '86EFAC' } }
    }
  },
  // Status Inativo
  statusInactive: {
    font: { bold: true, color: { rgb: 'DC2626' }, sz: 10 },
    fill: { fgColor: { rgb: 'FEE2E2' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FCA5A5' } },
      bottom: { style: 'thin', color: { rgb: 'FCA5A5' } },
      left: { style: 'thin', color: { rgb: 'FCA5A5' } },
      right: { style: 'thin', color: { rgb: 'FCA5A5' } }
    }
  },
  // KPI valor destacado
  kpiValue: {
    font: { bold: true, color: { rgb: '1E40AF' }, sz: 18, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'DBEAFE' }, patternType: 'solid' },
    border: {
      top: { style: 'medium', color: { rgb: '3B82F6' } },
      bottom: { style: 'medium', color: { rgb: '3B82F6' } },
      left: { style: 'medium', color: { rgb: '3B82F6' } },
      right: { style: 'medium', color: { rgb: '3B82F6' } }
    }
  },
  // Seção verde
  sectionGreen: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: '059669' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '047857' } },
      bottom: { style: 'medium', color: { rgb: '047857' } }
    }
  },
  // Seção laranja
  sectionOrange: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: 'EA580C' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: 'C2410C' } },
      bottom: { style: 'medium', color: { rgb: 'C2410C' } }
    }
  },
  // Título de aba colorido
  tabTitle: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16, name: 'Calibri' },
    fill: { fgColor: { rgb: '7C3AED' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '6D28D9' } },
      bottom: { style: 'medium', color: { rgb: '6D28D9' } }
    }
  },
  // Destaque amarelo
  highlight: {
    font: { bold: true, color: { rgb: '92400E' }, sz: 10 },
    fill: { fgColor: { rgb: 'FEF3C7' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  // Moeda
  currency: {
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: 'R$ #,##0.00',
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  // Total em azul escuro
  total: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '1E40AF' }, patternType: 'solid' },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: 'R$ #,##0.00',
    border: {
      top: { style: 'medium', color: { rgb: '1E3A8A' } },
      bottom: { style: 'medium', color: { rgb: '1E3A8A' } }
    }
  },
  // Chart header
  chartHeader: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '0891B2' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '0E7490' } },
      bottom: { style: 'medium', color: { rgb: '0E7490' } }
    }
  }
};

// ============================================
// DADOS DOS MINISTÉRIOS ATUALIZADOS
// ============================================
const ministeriosData = {
  headers: ['ID', 'Nome do Ministério', 'Líder', 'Membros', 'Visitantes', 'Reuniões/Mês', 'Total Reuniões 2024', 'Status'],
  data: [
    ['M001', 'Louvor e Adoração', 'Pastor João Silva', 45, 12, 12, 144, 'Ativo'],
    ['M002', 'Intercessão', 'Irmã Ana Costa', 32, 8, 4, 48, 'Ativo'],
    ['M003', 'Evangelismo - Missões', 'Pr. Carlos Oliveira', 28, 25, 8, 96, 'Ativo'],
    ['M004', 'Infantil - Célula Kids', 'Tia Maria João', 25, 15, 4, 48, 'Ativo'],
    ['M005', 'Jovens - Impacto Jovem', 'Pr. Ricardo Souza', 52, 18, 8, 96, 'Ativo'],
    ['M006', 'Mídia e Comunicação', 'Julia Mendes', 15, 5, 4, 48, 'Ativo'],
    ['M007', 'Diaconia - Assistência', 'Diácono Pedro', 20, 30, 6, 72, 'Ativo']
  ]
};

// Dados históricos para gráfico de evolução (últimos 6 meses)
const evolucaoData = {
  meses: ['Dez/24', 'Jan/25', 'Fev/25', 'Mar/25', 'Abr/25', 'Mai/25'],
  ministerios: [
    { nome: 'Louvor e Adoração', dados: [38, 40, 42, 43, 44, 45] },
    { nome: 'Intercessão', dados: [28, 29, 30, 31, 31, 32] },
    { nome: 'Evangelismo', dados: [22, 24, 25, 26, 27, 28] },
    { nome: 'Infantil', dados: [20, 21, 22, 23, 24, 25] },
    { nome: 'Jovens', dados: [45, 47, 49, 50, 51, 52] },
    { nome: 'Mídia', dados: [12, 13, 14, 14, 15, 15] },
    { nome: 'Diaconia', dados: [16, 17, 18, 19, 19, 20] }
  ]
};

export function MinisteriosReportCard({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const calcularEstatisticas = () => {
    const data = ministeriosData.data;
    const totalMembros = data.reduce((sum, row) => sum + (row[3] as number), 0);
    const totalVisitantes = data.reduce((sum, row) => sum + (row[4] as number), 0);
    const totalReunioes = data.reduce((sum, row) => sum + (row[6] as number), 0);
    const mediaReunioesMes = data.reduce((sum, row) => sum + (row[5] as number), 0) / data.length;
    const taxaRetencao = ((totalMembros / (totalMembros + totalVisitantes)) * 100).toFixed(1);
    
    return {
      totalMinisterios: data.length,
      totalMembros,
      totalVisitantes,
      totalReunioes,
      mediaReunioesMes: Math.round(mediaReunioesMes),
      taxaRetencao,
      maiorMinisterio: data.reduce((max, row) => (row[3] as number) > (max[3] as number) ? row : max, data[0])[1],
      maisReunioes: data.reduce((max, row) => (row[6] as number) > (max[6] as number) ? row : max, data[0])[1]
    };
  };

  // Aba 1: Dados dos Ministérios
  const criarAbaDados = async (churchName: string) => {
    const wsData = [
      [`GESTÃO DE MINISTÉRIOS - ${churchName}`],
      [`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`],
      [],
      ministeriosData.headers,
      ...ministeriosData.data
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['A1'] = { v: wsData[0][0], s: STYLES.title };
    ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
    
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
    ];

    // Cabeçalhos
    for (let c = 0; c < 8; c++) {
      ws[XLSX.utils.encode_cell({ r: 3, c })] = { 
        v: ministeriosData.headers[c], 
        s: STYLES.header 
      };
    }

    // Dados com formatação e linhas zebradas
    for (let r = 4; r < wsData.length; r++) {
      const row = wsData[r] as (string | number)[];
      const isEven = (r - 4) % 2 === 0; // Linha par ou ímpar para zebrado
      
      // Estilo de célula base (normal ou zebrado)
      const cellStyle = isEven ? STYLES.cell : STYLES.cellAlt;
      const intStyle = isEven ? STYLES.integer : STYLES.integerAlt;
      
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { 
        v: row[0], 
        s: { ...cellStyle, font: { bold: true, sz: 10, color: { rgb: '1E40AF' } } } 
      };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: row[1], s: cellStyle };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: row[2], s: cellStyle };
      
      // Números (Membros, Visitantes, Reuniões)
      for (let c = 3; c <= 6; c++) {
        ws[XLSX.utils.encode_cell({ r, c })] = { v: row[c], t: 'n', s: intStyle };
      }
      
      // Status com cor vibrante
      ws[XLSX.utils.encode_cell({ r, c: 7 })] = { 
        v: row[7], 
        s: row[7] === 'Ativo' ? STYLES.statusActive : STYLES.statusInactive 
      };
    }

    ws['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 22 }, { wch: 10 }, 
      { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 10 }
    ];

    return ws;
  };

  // Aba 2: Resumo com KPIs
  const criarAbaResumo = async (churchName: string) => {
    const stats = calcularEstatisticas();
    
    const wsData = [
      [`DASHBOARD EXECUTIVO - MINISTÉRIOS - ${churchName}`],
      [`Atualizado: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['INDICADORES CHAVE (KPIs)'],
      [],
      ['Total de Ministérios', stats.totalMinisterios, 'unidades ativas'],
      ['Total de Membros', stats.totalMembros, 'pessoas comprometidas'],
      ['Total de Visitantes', stats.totalVisitantes, 'pessoas em acompanhamento'],
      ['Total de Reuniões (2024)', stats.totalReunioes, 'encontros realizados'],
      ['Média Reuniões/Mês', stats.mediaReunioesMes, 'por ministério'],
      ['Taxa de Retenção', `${stats.taxaRetencao}%`, 'membros vs visitantes'],
      [],
      ['DESTAQUES'],
      ['Maior Ministério', stats.maiorMinisterio, 'em número de membros'],
      ['Mais Reuniões', stats.maisReunioes, 'em frequência de encontros']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['A1'] = { v: wsData[0][0], s: STYLES.tabTitle };
    ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
    ws['A4'] = { v: wsData[3][0], s: STYLES.sectionGreen };
    ws['A14'] = { v: wsData[13][0], s: STYLES.sectionOrange };

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
      { s: { r: 13, c: 0 }, e: { r: 13, c: 2 } }
    ];

    for (let r = 5; r < 13; r++) {
      const label = wsData[r][0];
      const value = wsData[r][1];
      
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { 
        v: label, 
        s: { ...STYLES.cell, font: { bold: true, sz: 11 } } 
      };
      
      if (typeof value === 'number') {
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: value, t: 'n', s: STYLES.kpiValue };
      } else {
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: value, s: STYLES.kpiValue };
      }
      
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { 
        v: wsData[r][2], 
        s: { ...STYLES.cell, font: { italic: true, color: { rgb: '6B7280' } } } 
      };
    }

    for (let r = 14; r < 16; r++) {
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: wsData[r][0], s: { ...STYLES.cell, font: { bold: true } } };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: wsData[r][1], s: STYLES.kpiValue };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: wsData[r][2], s: { ...STYLES.cell, font: { italic: true, color: { rgb: '6B7280' } } } };
    }

    ws['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 25 }];

    return ws;
  };

  // Aba 3: Evolução dos Ministérios (dados para gráfico de linha)
  const criarAbaEvolucao = async (churchName: string) => {
    const { meses, ministerios } = evolucaoData;
    
    const wsData = [
      [`EVOLUÇÃO DOS MINISTÉRIOS - ${churchName} - ÚLTIMOS 6 MESES`],
      ['Dados para criar gráfico de linha: Selecione toda a tabela e insira Gráfico de Linha'],
      [],
      ['Mês', ...meses],
      ...ministerios.map(m => [m.nome, ...m.dados]),
      [],
      ['TOTAL POR MÊS'],
      ['Total Membros', ...meses.map((_, i) => ministerios.reduce((sum, m) => sum + m.dados[i], 0))],
      ['Crescimento %', '', ...meses.slice(1).map((_, i) => {
        const atual = ministerios.reduce((sum, m) => sum + m.dados[i + 1], 0);
        const anterior = ministerios.reduce((sum, m) => sum + m.dados[i], 0);
        return ((atual - anterior) / anterior * 100).toFixed(1) + '%';
      })]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['A1'] = { v: wsData[0][0], s: STYLES.tabTitle };
    ws['A2'] = { v: wsData[1][0], s: { ...STYLES.subtitle, font: { italic: true, sz: 9, color: { rgb: '0891B2' } } } };
    
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    // Cabeçalho dos meses
    ws['A3'] = { v: 'Mês', s: STYLES.chartHeader };
    for (let c = 1; c <= 6; c++) {
      ws[XLSX.utils.encode_cell({ r: 3, c })] = { v: meses[c - 1], s: STYLES.chartHeader };
    }

    // Dados dos ministérios com zebrado
    for (let r = 4; r < 4 + ministerios.length; r++) {
      const isEven = (r - 4) % 2 === 0;
      const rowStyle = isEven ? STYLES.cell : STYLES.cellAlt;
      const intStyle = isEven ? STYLES.integer : STYLES.integerAlt;
      
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: wsData[r][0], s: { ...rowStyle, font: { bold: true, color: { rgb: '0E7490' } } } };
      for (let c = 1; c <= 6; c++) {
        ws[XLSX.utils.encode_cell({ r, c })] = { v: wsData[r][c], t: 'n', s: intStyle };
      }
    }

    // Seção de totais
    const totalRow = 4 + ministerios.length + 2;
    ws[XLSX.utils.encode_cell({ r: totalRow - 1, c: 0 })] = { 
      v: 'TOTAL POR MÊS', 
      s: STYLES.sectionOrange 
    };
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 6 } }];

    ws[XLSX.utils.encode_cell({ r: totalRow, c: 0 })] = { v: 'Total Membros', s: { ...STYLES.cell, font: { bold: true } } };
    for (let c = 1; c <= 6; c++) {
      ws[XLSX.utils.encode_cell({ r: totalRow, c })] = { 
        v: wsData[totalRow][c], 
        t: 'n', 
        s: { ...STYLES.integer, font: { bold: true, color: { rgb: 'C2410C' } }, fill: { fgColor: { rgb: 'FFF7ED' } } } 
      };
    }

    ws[XLSX.utils.encode_cell({ r: totalRow + 1, c: 0 })] = { v: 'Crescimento %', s: { ...STYLES.cell, font: { bold: true } } };
    ws[XLSX.utils.encode_cell({ r: totalRow + 1, c: 1 })] = { v: '-', s: STYLES.cell };
    for (let c = 2; c <= 6; c++) {
      ws[XLSX.utils.encode_cell({ r: totalRow + 1, c })] = { 
        v: wsData[totalRow + 1][c], 
        s: STYLES.highlight
      };
    }

    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

    return ws;
  };

  // Aba 4: Análise Comparativa
  const criarAbaAnalise = async (churchName: string) => {
    const data = ministeriosData.data;
    
    const wsData = [
      [`ANÁLISE COMPARATIVA - EFICIÊNCIA DOS MINISTÉRIOS - ${churchName}`],
      [],
      ['Ministério', 'Membros', 'Visitantes', 'Total Pessoas', 'Reuniões/Ano', 'Pessoas/Reunião', 'Taxa Conv.'],
      ...data.map(row => {
        const totalPessoas = (row[3] as number) + (row[4] as number);
        const pessoasPorReuniao = (totalPessoas / (row[6] as number)).toFixed(1);
        const taxaConversao = ((row[3] as number) / totalPessoas * 100).toFixed(1);
        return [
          row[1], row[3], row[4], totalPessoas, row[6], 
          parseFloat(pessoasPorReuniao), parseFloat(taxaConversao)
        ];
      })
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['A1'] = { v: wsData[0][0], s: STYLES.tabTitle };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    const headers = ['Ministério', 'Membros', 'Visitantes', 'Total Pessoas', 'Reuniões/Ano', 'Pessoas/Reunião', 'Taxa Conv.%'];
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: 2, c })] = { v: h, s: STYLES.header };
    });

    for (let r = 3; r < 3 + data.length; r++) {
      const isEven = (r - 3) % 2 === 0;
      const cellStyle = isEven ? STYLES.cell : STYLES.cellAlt;
      const intStyle = isEven ? STYLES.integer : STYLES.integerAlt;
      
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: wsData[r][0], s: cellStyle };
      for (let c = 1; c <= 4; c++) {
        ws[XLSX.utils.encode_cell({ r, c })] = { v: wsData[r][c], t: 'n', s: intStyle };
      }
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: wsData[r][5], t: 'n', s: { ...intStyle, numFmt: '0.0' } };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: wsData[r][6], t: 'n', s: { ...intStyle, numFmt: '0.0%"' } };
    }

    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 13 }, { wch: 13 }, { wch: 15 }, { wch: 12 }];

    return ws;
  };

  const handleDownload = async () => {
    try {
      // Buscar nome da igreja
      let churchName = 'IGREJA LOCAL';
      if (user?.churchId) {
        try {
          const church = await churchesService.getById(user.churchId);
          if (church?.name) churchName = church.name.toUpperCase();
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      // Gerar planilha dinamicamente
      const wb = XLSX.utils.book_new();
      
      const wsDados = await criarAbaDados(churchName);
      const wsResumo = await criarAbaResumo(churchName);
      const wsEvolucao = await criarAbaEvolucao(churchName);
      const wsAnalise = await criarAbaAnalise(churchName);
      
      XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Dashboard');
      XLSX.utils.book_append_sheet(wb, wsEvolucao, 'Evolução');
      XLSX.utils.book_append_sheet(wb, wsAnalise, 'Análise');

      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `Planilha_Ministerios_${churchName.replace(/\s+/g, '_')}.xlsx`;
      
      saveAs(blob, fileName);
      
      toast({
        title: 'Download iniciado!',
        description: 'Planilha de Ministérios sendo baixada.',
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar a planilha.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-cyan-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Ministérios</CardTitle>
            <CardDescription className="text-sm">
              Reuniões, membros, visitantes e evolução com dados para gráficos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar Excel Completo
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          4 abas: Dados + Dashboard + Evolução (6 meses) + Análise
        </p>
      </CardContent>
    </Card>
  );
}

export default MinisteriosReportCard;
