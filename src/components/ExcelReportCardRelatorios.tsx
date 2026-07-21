import { FileSpreadsheet, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { churchesService } from '@/services/churches.service';

// ============================================
// ESTILOS PROFISSIONAIS - RELATÓRIO ANUAL
// ============================================
const STYLES = {
  // Título principal azul escuro (como na imagem)
  mainTitle: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16, name: 'Calibri' },
    fill: { fgColor: { rgb: '1E3A8A' }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'medium', color: { rgb: '1E40AF' } }
    }
  },
  // Subtítulo cinza claro
  subtitle: {
    font: { italic: true, color: { rgb: '64748B' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    fill: { fgColor: { rgb: 'F1F5F9' }, patternType: 'solid' }
  },
  // Título da tabela azul
  tableTitle: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14, name: 'Calibri' },
    fill: { fgColor: { rgb: '3730A3' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  // Cabeçalho azul médio
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
    fill: { fgColor: { rgb: '4338CA' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '6366F1' } },
      bottom: { style: 'thin', color: { rgb: '6366F1' } },
      left: { style: 'thin', color: { rgb: '6366F1' } },
      right: { style: 'thin', color: { rgb: '6366F1' } }
    }
  },
  // Indicador (primeira coluna)
  indicator: {
    font: { bold: true, color: { rgb: '1E3A8A' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Célula de dados normal
  cell: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Célula zebrada
  cellAlt: {
    alignment: { horizontal: 'center', vertical: 'center' },
    font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F8FAFC' }, patternType: 'solid' },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  // Total/Média laranja (como na imagem)
  totalHeader: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
    fill: { fgColor: { rgb: 'EA580C' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'F97316' } },
      bottom: { style: 'thin', color: { rgb: 'F97316' } },
      left: { style: 'thin', color: { rgb: 'F97316' } },
      right: { style: 'thin', color: { rgb: 'F97316' } }
    }
  },
  // Valor total
  totalValue: {
    font: { bold: true, color: { rgb: '1E40AF' }, sz: 10, name: 'Calibri' },
    fill: { fgColor: { rgb: 'DBEAFE' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '93C5FD' } },
      bottom: { style: 'thin', color: { rgb: '93C5FD' } },
      left: { style: 'thin', color: { rgb: '93C5FD' } },
      right: { style: 'thin', color: { rgb: '93C5FD' } }
    }
  },
  // Linha total geral azul claro
  grandTotal: {
    font: { bold: true, color: { rgb: '1E40AF' }, sz: 11, name: 'Calibri' },
    fill: { fgColor: { rgb: 'BFDBFE' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '3B82F6' } },
      bottom: { style: 'medium', color: { rgb: '3B82F6' } },
      left: { style: 'thin', color: { rgb: '3B82F6' } },
      right: { style: 'thin', color: { rgb: '3B82F6' } }
    }
  },
  // Label total geral
  grandTotalLabel: {
    font: { bold: true, color: { rgb: '1E40AF' }, sz: 11, name: 'Calibri' },
    fill: { fgColor: { rgb: 'BFDBFE' }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '3B82F6' } },
      bottom: { style: 'medium', color: { rgb: '3B82F6' } },
      left: { style: 'thin', color: { rgb: '3B82F6' } },
      right: { style: 'thin', color: { rgb: '3B82F6' } }
    }
  }
};

// ============================================
// DADOS DO RELATÓRIO ANUAL 2026
// ============================================
const relatorioData = {
  indicadores: [
    'Frequência no Culto Principal',
    'Visitantes',
    'Batismos',
    'Novos Membros',
    'Células Realizadas',
    'Alunos nas Escolas',
    'Discipulados Ativos',
    'Pedidos de Oração Atendidos'
  ],
  meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dados: [
    [120, 115, 130, 125, 140, 135, 150, 145, 155, 160, 165, 170],
    [8, 6, 10, 7, 12, 9, 14, 11, 13, 15, 12, 18],
    [0, 2, 0, 3, 0, 4, 0, 2, 0, 3, 0, 5],
    [2, 3, 1, 4, 2, 5, 3, 2, 4, 3, 2, 6],
    [18, 17, 20, 19, 22, 21, 24, 23, 25, 26, 24, 28],
    [35, 33, 38, 36, 40, 39, 42, 41, 43, 45, 42, 48],
    [10, 10, 12, 11, 13, 12, 14, 13, 15, 14, 15, 16],
    [25, 22, 30, 28, 32, 30, 35, 33, 36, 38, 35, 40]
  ]
};

export function RelatoriosReportCard({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const criarAbaRelatorio = async (churchName: string) => {
    const { indicadores, meses, dados } = relatorioData;
    
    // Montar estrutura da planilha
    const wsData = [
      [`RELATÓRIOS - ${churchName}`],
      ['Consolidado mensal de indicadores eclesiásticos'],
      [],
      ['RELATÓRIO ANUAL — 2026'],
      ['INDICADOR', ...meses, 'TOTAL/\nMÉDIA'],
      ...indicadores.map((ind, i) => [ind, ...dados[i]]),
      ['TOTAL GERAL', ...meses.map((_, m) => dados.reduce((sum, row) => sum + row[m], 0))]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Título principal (A1) - Azul escuro
    ws['A1'] = { v: wsData[0][0], s: STYLES.mainTitle };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];

    // Subtítulo (A2) - Cinza
    ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }];

    // Título da tabela (A4) - Azul médio
    ws['A4'] = { v: wsData[3][0], s: STYLES.tableTitle };
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: 3, c: 0 }, e: { r: 3, c: 13 } }];

    // Cabeçalhos (linha 5)
    ws['A5'] = { v: 'INDICADOR', s: STYLES.header };
    for (let c = 1; c <= 12; c++) {
      ws[XLSX.utils.encode_cell({ r: 4, c })] = { v: meses[c - 1], s: STYLES.header };
    }
    ws['M5'] = { v: 'TOTAL/\nMÉDIA', s: STYLES.totalHeader };

    // Dados dos indicadores (linhas 6-13)
    for (let r = 5; r < 5 + indicadores.length; r++) {
      const indicadorIndex = r - 5;
      const isEven = indicadorIndex % 2 === 0;
      const cellStyle = isEven ? STYLES.cell : STYLES.cellAlt;
      
      // Nome do indicador
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { 
        v: indicadores[indicadorIndex], 
        s: STYLES.indicator 
      };
      
      // Dados mensais
      for (let c = 1; c <= 12; c++) {
        ws[XLSX.utils.encode_cell({ r, c })] = { 
          v: dados[indicadorIndex][c - 1], 
          t: 'n', 
          s: cellStyle 
        };
      }
      
      // Fórmula SOMASES para Total/Média
      const totalCell = XLSX.utils.encode_cell({ r, c: 13 });
      ws[totalCell] = { 
        f: `SUM(B${r + 1}:M${r + 1})`, 
        s: STYLES.totalValue 
      };
    }

    // Linha TOTAL GERAL
    const totalRow = 5 + indicadores.length;
    ws[XLSX.utils.encode_cell({ r: totalRow, c: 0 })] = { 
      v: 'TOTAL GERAL', 
      s: STYLES.grandTotalLabel 
    };
    
    for (let c = 1; c <= 12; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRow, c });
      const colLetter = XLSX.utils.encode_col(c);
      ws[cellRef] = { 
        f: `SUM(${colLetter}6:${colLetter}13)`, 
        s: STYLES.grandTotal 
      };
    }
    
    // Total geral (coluna N)
    ws[XLSX.utils.encode_cell({ r: totalRow, c: 13 })] = { 
      f: `SUM(B${totalRow + 1}:M${totalRow + 1})`, 
      s: { ...STYLES.grandTotal, font: { bold: true, color: { rgb: 'EA580C' }, sz: 11 } }
    };

    // Larguras de coluna
    ws['!cols'] = [
      { wch: 28 },  // INDICADOR
      { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
      { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
      { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
      { wch: 10 }   // TOTAL/MÉDIA
    ];

    return ws;
  };

  // Aba 2: Dashboard Resumido
  const criarAbaDashboard = async (churchName: string) => {
    const { indicadores, dados } = relatorioData;
    
    // Calcular totais anuais
    const totais = dados.map(row => row.reduce((sum, val) => sum + val, 0));
    const maxIndex = totais.indexOf(Math.max(...totais));
    
    const wsData = [
      [`DASHBOARD - INDICADORES 2026 - ${churchName}`],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['RESUMO EXECUTIVO'],
      [],
      ['Indicador', 'Total Anual', 'Média Mensal', 'Maior Mês'],
      ...indicadores.map((ind, i) => {
        const total = totais[i];
        const media = (total / 12).toFixed(1);
        const maiorMesVal = Math.max(...dados[i]);
        const maiorMesIdx = dados[i].indexOf(maiorMesVal);
        return [ind, total, parseFloat(media), `${relatorioData.meses[maiorMesIdx]} (${maiorMesVal})`];
      }),
      [],
      ['DESTAQUE'],
      ['Maior Indicador', indicadores[maxIndex], totais[maxIndex], 'em participação total']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Título
    ws['A1'] = { v: wsData[0][0], s: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 },
      fill: { fgColor: { rgb: '7C3AED' } },
      alignment: { horizontal: 'center' }
    }};
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    // Seção Resumo
    ws['A4'] = { v: wsData[3][0], s: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
      fill: { fgColor: { rgb: '059669' } },
      alignment: { horizontal: 'center' }
    }};
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }];

    // Cabeçalhos
    const headers = ['Indicador', 'Total Anual', 'Média Mensal', 'Maior Mês'];
    headers.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: 5, c })] = { 
        v: h, 
        s: { ...STYLES.header, fill: { fgColor: { rgb: '4338CA' } } }
      };
    });

    // Dados com zebrado
    for (let r = 6; r < 6 + indicadores.length; r++) {
      const isEven = (r - 6) % 2 === 0;
      const cellStyle = isEven ? STYLES.cell : STYLES.cellAlt;
      
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: wsData[r][0], s: { ...cellStyle, font: { bold: true, sz: 10 } } };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: wsData[r][1], t: 'n', s: STYLES.totalValue };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: wsData[r][2], t: 'n', s: cellStyle };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: wsData[r][3], s: cellStyle };
    }

    // Destaque
    const destaqueRow = 6 + indicadores.length + 1;
    ws[XLSX.utils.encode_cell({ r: destaqueRow, c: 0 })] = { 
      v: 'DESTAQUE', 
      s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'EA580C' } }, alignment: { horizontal: 'center' }}
    };
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: destaqueRow, c: 0 }, e: { r: destaqueRow, c: 3 } }];
    
    ws[XLSX.utils.encode_cell({ r: destaqueRow + 1, c: 0 })] = { v: 'Maior Indicador', s: { font: { bold: true }, fill: { fgColor: { rgb: 'FFEDD5' } } } };
    ws[XLSX.utils.encode_cell({ r: destaqueRow + 1, c: 1 })] = { v: indicadores[totais.indexOf(Math.max(...totais))], s: { font: { bold: true, color: { rgb: 'C2410C' } } } };
    ws[XLSX.utils.encode_cell({ r: destaqueRow + 1, c: 2 })] = { v: Math.max(...totais), t: 'n', s: { font: { bold: true, color: { rgb: 'C2410C' } }, fill: { fgColor: { rgb: 'FFEDD5' } } } };
    ws[XLSX.utils.encode_cell({ r: destaqueRow + 1, c: 3 })] = { v: 'em participação total', s: { font: { italic: true, color: { rgb: '6B7280' } } } };

    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];

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

      const wb = XLSX.utils.book_new();
      
      const wsRelatorio = await criarAbaRelatorio(churchName);
      const wsDashboard = await criarAbaDashboard(churchName);
      
      XLSX.utils.book_append_sheet(wb, wsRelatorio, 'Relatório Anual');
      XLSX.utils.book_append_sheet(wb, wsDashboard, 'Dashboard');

      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `relatorio_anual_igreja_2026_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      saveAs(blob, fileName);

      toast({
        title: '✅ Relatório Anual Gerado',
        description: '2 abas: Relatório Anual + Dashboard com cores profissionais',
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Relatórios Anuais</CardTitle>
            <CardDescription className="text-sm">
              Relatório mensal consolidado de indicadores eclesiásticos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar Relatório Anual
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          2 abas: Relatório mensal (12 meses) + Dashboard resumido
        </p>
      </CardContent>
    </Card>
  );
}

export default RelatoriosReportCard;
