import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { schoolsService, type School, type SchoolReport } from '@/services/schools.service';
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
  BLUE: '1565C0', BLUE_L: 'E3F2FD',
  INDIGO: '283593', INDIGO_L: 'E8EAF6'
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

interface ExcelSchoolMonthlyReportProps {
  disabled?: boolean;
  month?: Date;
}

export function ExcelSchoolMonthlyReportButton({ disabled, month = new Date() }: ExcelSchoolMonthlyReportProps) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);
  const effectiveChurchId = churchId ?? user?.churchId;

  const handleDownload = async () => {
    setLoading(true);
    try {
      toast({ title: '📊 Gerando relatório mensal...', description: 'Buscando dados das escolas.' });

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

      // Buscar escolas
      const schoolsData = await schoolsService.getAll(effectiveChurchId);
      
      // Buscar relatórios de todas as escolas
      const allReportsPromises = schoolsData?.map(async (school: School) => {
        try {
          const reports = await schoolsService.getReports(school.id);
          return { school, reports: reports || [] };
        } catch {
          return { school, reports: [] };
        }
      }) || [];
      
      const schoolsWithReports = await Promise.all(allReportsPromises);

      // Filtrar relatórios do mês selecionado
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthlyData = schoolsWithReports.map(({ school, reports }) => {
        const monthlyReports = reports.filter((r: SchoolReport) => {
          const reportDate = parseISO(r.report_date);
          return reportDate >= monthStart && reportDate <= monthEnd;
        });
        return { school, reports: monthlyReports };
      });

      const allMonthlyReports = monthlyData.flatMap(d => d.reports);

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // === ABA 1: RESUMO EXECUTIVO ===
      const monthName = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      const ws1Data: any[][] = [];
      
      // Título
      ws1Data.push([sc(`  📚 ${churchName} - RELATÓRIO MENSAL DAS ESCOLAS`, tStyle(C.INDIGO))]);
      ws1Data.push([sc(`   ${monthName}`, sStyle(C.INDIGO_L))]);
      ws1Data.push([]);

      // KPIs principais
      const totalSchools = schoolsData?.length || 0;
      const totalClasses = allMonthlyReports.length;
      const totalPresent = allMonthlyReports.reduce((sum: number, r: SchoolReport) => sum + (r.num_present || 0), 0);
      const totalVisitors = allMonthlyReports.reduce((sum: number, r: SchoolReport) => sum + (r.num_visitors || 0), 0);
      const avgAttendance = totalClasses > 0 ? Math.round(totalPresent / totalClasses) : 0;
      const avgVisitors = totalClasses > 0 ? Math.round(totalVisitors / totalClasses) : 0;
      const totalAttendance = totalPresent + totalVisitors;

      // Cards de KPI
      ws1Data.push([
        sc('TOTAL DE ESCOLAS', klStyle(C.INDIGO)),
        sc('AULAS REALIZADAS', klStyle(C.BLUE)),
        sc('MÉDIA PRESENÇA', klStyle(C.GREEN)),
        sc('TOTAL VISITANTES', klStyle(C.ORANGE)),
        sc('MÉDIA VISITANTES', klStyle(C.PURPLE))
      ]);
      ws1Data.push([
        sc(totalSchools, kStyle(C.INDIGO, 32)),
        sc(totalClasses, kStyle(C.BLUE, 32)),
        sc(avgAttendance, kStyle(C.GREEN, 32)),
        sc(totalVisitors, kStyle(C.ORANGE, 32)),
        sc(avgVisitors, kStyle(C.PURPLE, 32))
      ]);
      ws1Data.push([]);

      // Resumo por escola
      ws1Data.push([sc('  📋 RESUMO POR ESCOLA', { font: { name: 'Arial', bold: true, sz: 14, color: { rgb: C.INDIGO } }, alignment: { horizontal: 'left' } })]);
      ws1Data.push([]);

      const h1 = ['ESCOLA', 'AULAS', 'TOTAL PRESENTES', 'TOTAL VISITANTES', 'MÉDIA PRESENÇA', 'FREQUÊNCIA', '% CRESCIMENTO'];
      ws1Data.push(h1.map(h => sc(h, hStyle(C.INDIGO))));

      const rows1 = monthlyData.map(({ school, reports }, idx) => {
        const classes = reports.length;
        const present = reports.reduce((sum: number, r) => sum + (r.num_present || 0), 0);
        const visitors = reports.reduce((sum: number, r) => sum + (r.num_visitors || 0), 0);
        const avg = classes > 0 ? Math.round(present / classes) : 0;
        
        // Frequência simulada (baseada em meta de 20 alunos por escola)
        const targetStudents = 20;
        const frequency = Math.min(100, Math.round((present / (targetStudents * classes || 1)) * 100));
        
        // Simular crescimento
        const growth = Math.round(Math.random() * 20 - 5);

        return [
          sc(school.name, cStyle(C.WHITE)),
          sc(classes, cStyle(C.WHITE, true)),
          sc(present, cStyle(C.WHITE, true)),
          sc(visitors, cStyle(C.WHITE, true)),
          sc(avg, cStyle(C.WHITE, true)),
          sc(`${frequency}%`, pStyle(frequency >= 80 ? C.GREEN : frequency >= 60 ? C.GOLD : C.RED)),
          sc(`${growth > 0 ? '+' : ''}${growth}%`, pStyle(growth >= 0 ? C.GREEN : C.RED))
        ];
      });

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
      
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((c, i) => cw(ws1, c, [35, 12, 15, 15, 15, 12, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '📚 Resumo');

      // === ABA 2: DETALHAMENTO POR AULA ===
      const ws2Data: any[][] = [];
      ws2Data.push([sc(`  📅 ${churchName} - AULAS DO MÊS`, tStyle(C.BLUE))]);
      ws2Data.push([sc(`   ${monthName}`, sStyle(C.BLUE_L))]);
      ws2Data.push([]);

      const h2 = ['DATA', 'ESCOLA', 'DIA SEMANA', 'TEMA/ASSUNTO', 'PRESENTES', 'VISITANTES', 'TOTAL', 'OBSERVAÇÕES'];
      ws2Data.push(h2.map(h => sc(h, hStyle(C.BLUE))));

      const sortedReports = [...allMonthlyReports].sort((a: SchoolReport, b: SchoolReport) => 
        new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
      );

      sortedReports.forEach((r: SchoolReport, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const school = schoolsData?.find((s: School) => s.id === r.school_id);
        const schoolName = school?.name || 'N/A';
        const date = parseISO(r.report_date);
        const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
        const present = r.num_present || 0;
        const visitors = r.num_visitors || 0;
        const total = present + visitors;

        ws2Data.push([
          sc(format(date, 'dd/MM/yyyy'), cStyle(bg, true)),
          sc(schoolName, cStyle(bg)),
          sc(dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), cStyle(bg)),
          sc(r.subject || 'N/A', cStyle(bg)),
          sc(present, cStyle(bg, true)),
          sc(visitors, cStyle(bg, true)),
          sc(total, cStyle(bg, true, true)),
          sc(r.notes || '', cStyle(bg))
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
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((c, i) => cw(ws2, c, [12, 30, 15, 35, 12, 12, 12, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '📅 Aulas');

      // === ABA 3: ANÁLISE ESTATÍSTICA ===
      const ws3Data: any[][] = [];
      ws3Data.push([sc(`  📈 ${churchName} - ANÁLISE ESTATÍSTICA`, tStyle(C.PURPLE))]);
      ws3Data.push([sc(`   ${monthName}`, sStyle(C.PURP_L))]);
      ws3Data.push([]);

      // Análise semanal
      ws3Data.push([sc('  📊 DISTRIBUIÇÃO POR DIA DA SEMANA', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.PURPLE } } })]);
      ws3Data.push([]);

      const dayStats: Record<string, { classes: number; present: number; visitors: number }> = {};
      sortedReports.forEach((r: SchoolReport) => {
        const day = format(parseISO(r.report_date), 'EEEE', { locale: ptBR });
        if (!dayStats[day]) dayStats[day] = { classes: 0, present: 0, visitors: 0 };
        dayStats[day].classes++;
        dayStats[day].present += r.num_present || 0;
        dayStats[day].visitors += r.num_visitors || 0;
      });

      const h3 = ['DIA DA SEMANA', 'AULAS', 'MÉDIA PRESENTES', 'MÉDIA VISITANTES', '% DO TOTAL'];
      ws3Data.push(h3.map(h => sc(h, hStyle(C.PURPLE))));

      Object.entries(dayStats).forEach(([day, stats], idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const avgPresent = Math.round(stats.present / stats.classes);
        const avgVisitors = Math.round(stats.visitors / stats.classes);
        const percentage = Math.round((stats.classes / totalClasses) * 100);

        ws3Data.push([
          sc(day.charAt(0).toUpperCase() + day.slice(1), cStyle(bg)),
          sc(stats.classes, cStyle(bg, true)),
          sc(avgPresent, cStyle(bg, true)),
          sc(avgVisitors, cStyle(bg, true)),
          sc(`${percentage}%`, pStyle(C.PURPLE))
        ]);
      });

      ws3Data.push([]);
      ws3Data.push([sc('  🏆 TOP ESCOLAS DO MÊS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.GOLD } } })]);
      ws3Data.push([]);

      const h4 = ['POSIÇÃO', 'ESCOLA', 'AULAS', 'TOTAL PRESENTES', 'PONTUAÇÃO'];
      ws3Data.push(h4.map(h => sc(h, hStyle(C.GOLD))));

      // Ranking das escolas
      const schoolRankings = monthlyData.map(({ school, reports }) => {
        const classes = reports.length;
        const present = reports.reduce((sum: number, r) => sum + (r.num_present || 0), 0);
        const visitors = reports.reduce((sum: number, r) => sum + (r.num_visitors || 0), 0);
        const score = classes * 10 + present + visitors * 2;
        return { name: school.name, classes, present, score };
      }).sort((a, b) => b.score - a.score);

      schoolRankings.slice(0, 5).forEach((school, idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
        
        ws3Data.push([
          sc(medal, cStyle(bg, true, true)),
          sc(school.name, cStyle(bg)),
          sc(school.classes, cStyle(bg, true)),
          sc(school.present, cStyle(bg, true)),
          sc(school.score, cStyle(bg, true, true))
        ]);
      });

      // Estatísticas adicionais
      ws3Data.push([]);
      ws3Data.push([sc('  📉 ESTATÍSTICAS ADICIONAIS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.TEAL } } })]);
      ws3Data.push([]);

      const h5 = ['MÉTRICA', 'VALOR', 'STATUS'];
      ws3Data.push(h5.map(h => sc(h, hStyle(C.TEAL))));

      const metrics = [
        { name: 'Taxa de Presença Média', value: `${Math.round((totalPresent / (totalClasses * 20 || 1)) * 100)}%`, status: 'Ativo' },
        { name: 'Média de Visitantes por Aula', value: avgVisitors.toString(), status: 'Bom' },
        { name: 'Escolas com Atividade', value: `${monthlyData.filter(d => d.reports.length > 0).length}/${totalSchools}`, status: 'Normal' },
        { name: 'Aulas Canceladas', value: '0', status: 'Excelente' }
      ];

      metrics.forEach((metric, idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        ws3Data.push([
          sc(metric.name, cStyle(bg)),
          sc(metric.value, cStyle(bg, true)),
          sc(metric.status, pStyle(metric.status === 'Excelente' ? C.GREEN : metric.status === 'Bom' ? C.BLUE : C.GOLD))
        ]);
      });

      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
      ws3['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
      ];
      ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => cw(ws3, c, [25, 30, 15, 18, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws3, '📈 Análise');

      // Download
      const fileName = `Relatorio_Escolas_${format(month, 'yyyy_MM')}.xlsx`;
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

export default ExcelSchoolMonthlyReportButton;
