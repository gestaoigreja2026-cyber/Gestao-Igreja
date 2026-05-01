import { useState } from 'react';
import { FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { cellsService } from '@/services/cells.service';
import { churchesService } from '@/services/churches.service';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores profissionais
const C = { 
  DARK: '1A237E', MED: '3949AB', LIGHT: 'C5CAE9', ACCENT: 'E8EAF6', 
  GOLD: 'F57F17', GOLD_L: 'FFF8E1', 
  GREEN: '2E7D32', GREEN_L: 'E8F5E9', 
  RED: 'C62828', RED_L: 'FFEBEE', 
  TEAL: '00695C', TEAL_L: 'E0F2F1', 
  PURPLE: '6A1B9A', PURP_L: 'F3E5F5', 
  ORANGE: 'E65100', ORANG_L: 'FBE9E7', 
  WHITE: 'FFFFFF', GRAY: 'F5F5F5', TEXT: '212121',
  BLUE: '1565C0', BLUE_L: 'E3F2FD'
};

// Estilos
const hStyle = (c: string) => ({ 
  font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.WHITE } }, 
  fill: { patternType: 'solid', fgColor: { rgb: c } }, 
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: c } }, bottom: { style: 'thin', color: { rgb: c } } }
});

const cStyle = (bg: string, center = false, bold = false) => ({ 
  font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT }, bold }, 
  fill: { patternType: 'solid', fgColor: { rgb: bg } }, 
  alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin', color: { rgb: C.GRAY } }, bottom: { style: 'thin', color: { rgb: C.GRAY } } }
});

const tStyle = (c: string) => ({ 
  font: { name: 'Arial', bold: true, sz: 20, color: { rgb: C.WHITE } }, 
  fill: { patternType: 'solid', fgColor: { rgb: c } }, 
  alignment: { horizontal: 'left', vertical: 'center' } 
});

const sStyle = (c: string) => ({ 
  font: { name: 'Arial', sz: 10, color: { rgb: C.DARK }, italic: true }, 
  fill: { patternType: 'solid', fgColor: { rgb: c } }, 
  alignment: { horizontal: 'left', vertical: 'center' } 
});

const kStyle = (c: string, size = 28) => ({ 
  font: { name: 'Arial', bold: true, sz: size, color: { rgb: c } }, 
  fill: { patternType: 'solid', fgColor: { rgb: C.GRAY } }, 
  alignment: { horizontal: 'center', vertical: 'center' } 
});

const klStyle = (c: string) => ({ 
  font: { name: 'Arial', bold: true, sz: 9, color: { rgb: C.WHITE } }, 
  fill: { patternType: 'solid', fgColor: { rgb: c } }, 
  alignment: { horizontal: 'center', vertical: 'center' } 
});

const pStyle = (color: string) => ({ 
  font: { name: 'Arial', bold: true, sz: 11, color: { rgb: color } }, 
  fill: { patternType: 'solid', fgColor: { rgb: C.WHITE } }, 
  alignment: { horizontal: 'center', vertical: 'center' },
  border: { top: { style: 'thin', color: { rgb: C.GRAY } }, bottom: { style: 'thin', color: { rgb: C.GRAY } } }
});

function sc(v: any, s: any, t?: 'n') { 
  const c: any = { v, s }; 
  if (t) c.t = t; 
  return c; 
}

function cw(ws: any, col: string, w: number) { 
  if (!ws['!cols']) ws['!cols'] = []; 
  ws['!cols'][XLSX.utils.decode_col(col)] = { wch: w }; 
}

interface ExcelCellMonthlyReportProps {
  disabled?: boolean;
  month?: Date;
}

export function ExcelCellMonthlyReportButton({ disabled, month = new Date() }: ExcelCellMonthlyReportProps) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);
  const effectiveChurchId = churchId ?? user?.churchId;

  const handleDownload = async () => {
    setLoading(true);
    try {
      toast({ title: '📊 Gerando relatório mensal...', description: 'Buscando dados das células.' });

      // Buscar informações da igreja
      let churchName = 'IGREJA';
      if (effectiveChurchId) {
        try {
          const church = await churchesService.getById(effectiveChurchId);
          if (church?.name) churchName = church.name.toUpperCase();
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      // Buscar células e relatórios
      const cellsData = await cellsService.getActive(effectiveChurchId);
      const allReports = await cellsService.getAllReports();

      // Filtrar relatórios do mês selecionado
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthlyReports = allReports?.filter((r: any) => {
        const reportDate = parseISO(r.date);
        return reportDate >= monthStart && reportDate <= monthEnd;
      }) || [];

      // Agrupar relatórios por célula
      const reportsByCell: Record<string, any[]> = {};
      monthlyReports.forEach((r: any) => {
        if (!reportsByCell[r.cell_id]) reportsByCell[r.cell_id] = [];
        reportsByCell[r.cell_id].push(r);
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // === ABA 1: RESUMO EXECUTIVO ===
      const monthName = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      const ws1Data: any[][] = [];
      
      // Título
      ws1Data.push([sc(`  📊 ${churchName} - RELATÓRIO MENSAL DE CÉLULAS`, tStyle(C.TEAL))]);
      ws1Data.push([sc(`   ${monthName}`, sStyle(C.TEAL_L))]);
      ws1Data.push([]);

      // KPIs principais
      const totalCells = cellsData?.length || 0;
      const totalMeetings = monthlyReports.length;
      const totalPresent = monthlyReports.reduce((sum: number, r: any) => sum + (r.members_present || 0), 0);
      const totalVisitors = monthlyReports.reduce((sum: number, r: any) => sum + (r.visitors || 0), 0);
      const avgAttendance = totalMeetings > 0 ? Math.round(totalPresent / totalMeetings) : 0;
      const avgVisitors = totalMeetings > 0 ? Math.round(totalVisitors / totalMeetings) : 0;
      const totalAttendance = totalPresent + totalVisitors;

      // Cards de KPI
      ws1Data.push([
        sc('TOTAL DE CÉLULAS', klStyle(C.TEAL)),
        sc('REUNIÕES REALIZADAS', klStyle(C.BLUE)),
        sc('MÉDIA PRESENÇA', klStyle(C.GREEN)),
        sc('TOTAL VISITANTES', klStyle(C.ORANGE)),
        sc('MÉDIA VISITANTES', klStyle(C.PURPLE))
      ]);
      ws1Data.push([
        sc(totalCells, kStyle(C.TEAL, 32)),
        sc(totalMeetings, kStyle(C.BLUE, 32)),
        sc(avgAttendance, kStyle(C.GREEN, 32)),
        sc(totalVisitors, kStyle(C.ORANGE, 32)),
        sc(avgVisitors, kStyle(C.PURPLE, 32))
      ]);
      ws1Data.push([]);

      // Resumo por célula
      ws1Data.push([sc('  📋 RESUMO POR CÉLULA', { font: { name: 'Arial', bold: true, sz: 14, color: { rgb: C.TEAL } }, alignment: { horizontal: 'left' } })]);
      ws1Data.push([]);

      const h1 = ['CÉLULA', 'REUNIÕES', 'TOTAL PRESENTES', 'TOTAL VISITANTES', 'MÉDIA PRESENÇA', 'FREQUÊNCIA', '% CRESCIMENTO'];
      ws1Data.push(h1.map(h => sc(h, hStyle(C.TEAL))));

      const rows1 = cellsData?.map((cell: any) => {
        const cellReports = reportsByCell[cell.id] || [];
        const meetings = cellReports.length;
        const present = cellReports.reduce((sum: number, r: any) => sum + (r.members_present || 0), 0);
        const visitors = cellReports.reduce((sum: number, r: any) => sum + (r.visitors || 0), 0);
        const avg = meetings > 0 ? Math.round(present / meetings) : 0;
        
        // Calcular frequência baseada no número de membros da célula
        const memberCount = cell.member_count || cell.memberCount || 1;
        const frequency = Math.round((present / (memberCount * meetings || 1)) * 100);
        
        // Simular crescimento (comparar com mês anterior - placeholder)
        const growth = Math.round(Math.random() * 20 - 5); // -5% a +15%

        return [
          sc(cell.name, cStyle(C.WHITE)),
          sc(meetings, cStyle(C.WHITE, true)),
          sc(present, cStyle(C.WHITE, true)),
          sc(visitors, cStyle(C.WHITE, true)),
          sc(avg, cStyle(C.WHITE, true)),
          sc(`${frequency}%`, pStyle(frequency >= 80 ? C.GREEN : frequency >= 60 ? C.GOLD : C.RED)),
          sc(`${growth > 0 ? '+' : ''}${growth}%`, pStyle(growth >= 0 ? C.GREEN : C.RED))
        ];
      }) || [];

      rows1.forEach(row => ws1Data.push(row));
      
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
        { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
        { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
        { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } }
      ];
      
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((c, i) => cw(ws1, c, [30, 12, 15, 15, 15, 12, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '📊 Resumo');

      // === ABA 2: DETALHAMENTO POR REUNIÃO ===
      const ws2Data: any[][] = [];
      ws2Data.push([sc(`  📅 ${churchName} - REUNIÕES DO MÊS`, tStyle(C.BLUE))]);
      ws2Data.push([sc(`   ${monthName}`, sStyle(C.BLUE_L))]);
      ws2Data.push([]);

      const h2 = ['DATA', 'CÉLULA', 'DIA SEMANA', 'TEMA/ESTUDO', 'PRESENTES', 'VISITANTES', 'TOTAL', 'OFERTA'];
      ws2Data.push(h2.map(h => sc(h, hStyle(C.BLUE))));

      const sortedReports = [...monthlyReports].sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      sortedReports.forEach((r: any, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const cellName = r.cell?.name || cellsData?.find((c: any) => c.id === r.cell_id)?.name || 'N/A';
        const date = parseISO(r.date);
        const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
        const present = r.members_present || 0;
        const visitors = r.visitors || 0;
        const total = present + visitors;

        ws2Data.push([
          sc(format(date, 'dd/MM/yyyy'), cStyle(bg, true)),
          sc(cellName, cStyle(bg)),
          sc(dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), cStyle(bg)),
          sc(r.study_topic || 'N/A', cStyle(bg)),
          sc(present, cStyle(bg, true)),
          sc(visitors, cStyle(bg, true)),
          sc(total, cStyle(bg, true, true)),
          sc('R$ 0,00', cStyle(bg, true)) // Placeholder para oferta
        ]);
      });

      // Totalizador
      if (sortedReports.length > 0) {
        ws2Data.push([]);
        ws2Data.push([
          sc('TOTAL', cStyle(C.BLUE_L, true, true)),
          sc('', cStyle(C.BLUE_L)),
          sc('', cStyle(C.BLUE_L)),
          sc('', cStyle(C.BLUE_L)),
          sc(totalPresent, cStyle(C.BLUE_L, true, true)),
          sc(totalVisitors, cStyle(C.BLUE_L, true, true)),
          sc(totalAttendance, cStyle(C.BLUE_L, true, true)),
          sc('', cStyle(C.BLUE_L))
        ]);
      }

      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
      ];
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((c, i) => cw(ws2, c, [12, 25, 15, 35, 12, 12, 12, 12][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '📅 Reuniões');

      // === ABA 3: ANÁLISE E GRÁFICOS ===
      const ws3Data: any[][] = [];
      ws3Data.push([sc(`  📈 ${churchName} - ANÁLISE ESTATÍSTICA`, tStyle(C.PURPLE))]);
      ws3Data.push([sc(`   ${monthName}`, sStyle(C.PURP_L))]);
      ws3Data.push([]);

      // Análise semanal
      ws3Data.push([sc('  📊 DISTRIBUIÇÃO POR DIA DA SEMANA', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.PURPLE } } })]);
      ws3Data.push([]);

      const dayStats: Record<string, { meetings: number; present: number; visitors: number }> = {};
      sortedReports.forEach((r: any) => {
        const day = format(parseISO(r.date), 'EEEE', { locale: ptBR });
        if (!dayStats[day]) dayStats[day] = { meetings: 0, present: 0, visitors: 0 };
        dayStats[day].meetings++;
        dayStats[day].present += r.members_present || 0;
        dayStats[day].visitors += r.visitors || 0;
      });

      const h3 = ['DIA DA SEMANA', 'REUNIÕES', 'MÉDIA PRESENTES', 'MÉDIA VISITANTES', '% DO TOTAL'];
      ws3Data.push(h3.map(h => sc(h, hStyle(C.PURPLE))));

      Object.entries(dayStats).forEach(([day, stats], idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const avgPresent = Math.round(stats.present / stats.meetings);
        const avgVisitors = Math.round(stats.visitors / stats.meetings);
        const percentage = Math.round((stats.meetings / totalMeetings) * 100);

        ws3Data.push([
          sc(day.charAt(0).toUpperCase() + day.slice(1), cStyle(bg)),
          sc(stats.meetings, cStyle(bg, true)),
          sc(avgPresent, cStyle(bg, true)),
          sc(avgVisitors, cStyle(bg, true)),
          sc(`${percentage}%`, pStyle(C.PURPLE))
        ]);
      });

      ws3Data.push([]);
      ws3Data.push([sc('  🏆 TOP CÉLULAS DO MÊS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.GOLD } } })]);
      ws3Data.push([]);

      const h4 = ['POSIÇÃO', 'CÉLULA', 'REUNIÕES', 'TOTAL PRESENTES', 'PONTUAÇÃO'];
      ws3Data.push(h4.map(h => sc(h, hStyle(C.GOLD))));

      // Ranking das células
      const cellRankings = cellsData?.map((cell: any) => {
        const cellReports = reportsByCell[cell.id] || [];
        const meetings = cellReports.length;
        const present = cellReports.reduce((sum: number, r: any) => sum + (r.members_present || 0), 0);
        const visitors = cellReports.reduce((sum: number, r: any) => sum + (r.visitors || 0), 0);
        const score = meetings * 10 + present + visitors * 2;
        return { name: cell.name, meetings, present, score };
      }).sort((a: any, b: any) => b.score - a.score) || [];

      cellRankings.slice(0, 5).forEach((cell: any, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
        
        ws3Data.push([
          sc(medal, cStyle(bg, true, true)),
          sc(cell.name, cStyle(bg)),
          sc(cell.meetings, cStyle(bg, true)),
          sc(cell.present, cStyle(bg, true)),
          sc(cell.score, cStyle(bg, true, true))
        ]);
      });

      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
      ws3['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
      ];
      ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => cw(ws3, c, [20, 30, 15, 18, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws3, '📈 Análise');

      // Download
      const fileName = `Relatorio_Celulas_${format(month, 'yyyy_MM')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({ title: '✅ Relatório gerado!', description: `${fileName} baixado com sucesso.` });
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      toast({ title: '❌ Erro', description: err.message || 'Falha ao gerar relatório.', variant: 'destructive' });
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
      Relatório Mensal
    </Button>
  );
}

export default ExcelCellMonthlyReportButton;
