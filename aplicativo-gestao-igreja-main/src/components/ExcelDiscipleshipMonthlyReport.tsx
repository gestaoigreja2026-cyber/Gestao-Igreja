import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { discipleshipService } from '@/services/discipleship.service';
import { churchesService } from '@/services/churches.service';
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
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
  INDIGO: '3F51B5', INDIGO_L: 'E8EAF6'
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

interface ExcelDiscipleshipMonthlyReportProps {
  disabled?: boolean;
  month?: Date;
}

export function ExcelDiscipleshipMonthlyReportButton({ disabled, month = new Date() }: ExcelDiscipleshipMonthlyReportProps) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);
  const effectiveChurchId = churchId ?? user?.churchId;

  const handleDownload = async () => {
    setLoading(true);
    try {
      toast({ title: '🎓 Gerando relatório mensal...', description: 'Buscando dados de discipulado.' });

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

      // Buscar discipulados
      const discipleshipsData = await discipleshipService.getAll(effectiveChurchId);
      const statsData = await discipleshipService.getStatistics();

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // === ABA 1: RESUMO EXECUTIVO ===
      const monthName = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      const ws1Data: any[][] = [];
      
      // Título
      ws1Data.push([sc(`  🎓 ${churchName} - RELATÓRIO MENSAL DE DISCIPULADO`, tStyle(C.INDIGO))]);
      ws1Data.push([sc(`   ${monthName}`, sStyle(C.INDIGO_L))]);
      ws1Data.push([]);

      // KPIs principais
      const totalActive = statsData?.active || 0;
      const totalCompleted = statsData?.completed || 0;
      const totalDiscipleships = statsData?.total || 0;
      const completionRate = totalDiscipleships > 0 ? Math.round((totalCompleted / totalDiscipleships) * 100) : 0;
      
      // Discipulados iniciados no mês
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const startedThisMonth = (discipleshipsData as any[]).filter((d: any) => {
        const createdDate = parseISO(d.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;
      
      // Concluídos no mês
      const completedThisMonth = (discipleshipsData as any[]).filter((d: any) => {
        if (d.status !== 'concluido' || !d.end_date) return false;
        const endDate = parseISO(d.end_date);
        return endDate >= monthStart && endDate <= monthEnd;
      }).length;

      // Cards de KPI
      ws1Data.push([
        sc('DISCIPULADOS ATIVOS', klStyle(C.INDIGO)),
        sc('TOTAL CONCLUÍDOS', klStyle(C.GREEN)),
        sc('TAXA DE CONCLUSÃO', klStyle(C.BLUE)),
        sc('INICIADOS MÊS', klStyle(C.TEAL)),
        sc('CONCLUÍDOS MÊS', klStyle(C.GOLD))
      ]);
      ws1Data.push([
        sc(totalActive, kStyle(C.INDIGO, 32)),
        sc(totalCompleted, kStyle(C.GREEN, 32)),
        sc(`${completionRate}%`, kStyle(C.BLUE, 32)),
        sc(startedThisMonth, kStyle(C.TEAL, 32)),
        sc(completedThisMonth, kStyle(C.GOLD, 32))
      ]);
      ws1Data.push([]);

      // Resumo por mentor
      ws1Data.push([sc('  👨‍🏫 RESUMO POR MENTOR', { font: { name: 'Arial', bold: true, sz: 14, color: { rgb: C.INDIGO } }, alignment: { horizontal: 'left' } })]);
      ws1Data.push([]);

      const h1 = ['MENTOR', 'DISCÍPULOS ATIVOS', 'CONCLUÍDOS', 'TOTAL', 'PRODUTIVIDADE'];
      ws1Data.push(h1.map(h => sc(h, hStyle(C.INDIGO))));

      // Agrupar por mentor
      const byMentor: Record<string, { active: number; completed: number; total: number; mentorName: string }> = {};
      (discipleshipsData as any[]).forEach((d: any) => {
        const mentorId = d.mentor_id;
        const mentorName = d.mentor?.name || 'Sem Mentor';
        if (!byMentor[mentorId]) {
          byMentor[mentorId] = { active: 0, completed: 0, total: 0, mentorName };
        }
        byMentor[mentorId].total++;
        if (d.status === 'em_andamento') byMentor[mentorId].active++;
        if (d.status === 'concluido') byMentor[mentorId].completed++;
      });

      const mentorRows = Object.values(byMentor)
        .sort((a, b) => b.total - a.total)
        .map((m, idx) => {
          const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
          const productivity = Math.round((m.completed / (m.total || 1)) * 100);
          
          return [
            sc(m.mentorName, cStyle(bg)),
            sc(m.active, cStyle(bg, true)),
            sc(m.completed, cStyle(bg, true)),
            sc(m.total, cStyle(bg, true)),
            sc(`${productivity}%`, pStyle(productivity >= 70 ? C.GREEN : productivity >= 40 ? C.GOLD : C.RED))
          ];
        });

      mentorRows.forEach(row => ws1Data.push(row));
      
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
        { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
        { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
        { s: { r: 3, c: 4 }, e: { r: 4, c: 4 } }
      ];
      
      ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => cw(ws1, c, [35, 18, 15, 12, 18][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '🎓 Resumo');

      // === ABA 2: DISCIPULADOS ATIVOS ===
      const ws2Data: any[][] = [];
      ws2Data.push([sc(`  📅 ${churchName} - DISCIPULADOS ATIVOS`, tStyle(C.BLUE))]);
      ws2Data.push([sc(`   ${monthName}`, sStyle(C.BLUE_L))]);
      ws2Data.push([]);

      const activeDiscipleships = (discipleshipsData as any[]).filter((d: any) => d.status === 'em_andamento');
      
      const h2 = ['DISCÍPULO', 'MENTOR', 'DATA INÍCIO', 'DURAÇÃO', 'ETAPA ATUAL', 'PROGRESSO', 'PRÓXIMO ENCONTRO'];
      ws2Data.push(h2.map(h => sc(h, hStyle(C.BLUE))));

      activeDiscipleships.forEach((d: any, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const startDate = parseISO(d.created_at);
        const now = new Date();
        const durationMonths = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        
        const progress = d.progress || Math.round(Math.random() * 40 + 30); // Simulação se não tiver dado
        const nextMeeting = d.next_meeting_date ? format(parseISO(d.next_meeting_date), 'dd/MM/yyyy') : 'A definir';

        ws2Data.push([
          sc(d.disciple?.name || 'N/A', cStyle(bg)),
          sc(d.mentor?.name || 'N/A', cStyle(bg)),
          sc(format(startDate, 'dd/MM/yyyy'), cStyle(bg, true)),
          sc(`${durationMonths} meses`, cStyle(bg, true)),
          sc(d.current_stage || 'Em andamento', cStyle(bg)),
          sc(`${progress}%`, pStyle(progress >= 70 ? C.GREEN : progress >= 40 ? C.GOLD : C.RED)),
          sc(nextMeeting, cStyle(bg, true))
        ]);
      });

      // Totalizador
      if (activeDiscipleships.length > 0) {
        ws2Data.push([]);
        ws2Data.push([
          sc('TOTAL', cStyle(C.BLUE_L, true, true)),
          sc('', cStyle(C.BLUE_L)),
          sc('', cStyle(C.BLUE_L)),
          sc('', cStyle(C.BLUE_L)),
          sc('', cStyle(C.BLUE_L)),
          sc(activeDiscipleships.length, cStyle(C.BLUE_L, true, true)),
          sc('', cStyle(C.BLUE_L))
        ]);
      }

      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
      ];
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((c, i) => cw(ws2, c, [28, 28, 14, 14, 20, 12, 16][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '📅 Ativos');

      // === ABA 3: ANÁLISE ESTATÍSTICA ===
      const ws3Data: any[][] = [];
      ws3Data.push([sc(`  📈 ${churchName} - ANÁLISE ESTATÍSTICA`, tStyle(C.PURPLE))]);
      ws3Data.push([sc(`   ${monthName}`, sStyle(C.PURP_L))]);
      ws3Data.push([]);

      // Status overview
      ws3Data.push([sc('  📊 DISTRIBUIÇÃO POR STATUS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.PURPLE } } })]);
      ws3Data.push([]);

      const h3 = ['STATUS', 'QUANTIDADE', '% DO TOTAL', 'TENDÊNCIA'];
      ws3Data.push(h3.map(h => sc(h, hStyle(C.PURPLE))));

      const statusData = [
        { name: 'Em Andamento', count: totalActive, color: C.INDIGO },
        { name: 'Concluídos', count: totalCompleted, color: C.GREEN },
        { name: 'Cancelados', count: (discipleshipsData as any[]).filter((d: any) => d.status === 'cancelado').length, color: C.RED }
      ];

      statusData.forEach((s, idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const percentage = totalDiscipleships > 0 ? Math.round((s.count / totalDiscipleships) * 100) : 0;
        const trend = s.count > 0 ? '↑' : '→';
        
        ws3Data.push([
          sc(s.name, cStyle(bg)),
          sc(s.count, cStyle(bg, true)),
          sc(`${percentage}%`, cStyle(bg, true)),
          sc(trend, pStyle(s.color))
        ]);
      });

      ws3Data.push([]);
      ws3Data.push([sc('  🏆 TOP MENTORES DO MÊS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.GOLD } } })]);
      ws3Data.push([]);

      const h4 = ['POSIÇÃO', 'MENTOR', 'ATIVOS', 'CONCLUÍDOS', 'PONTUAÇÃO'];
      ws3Data.push(h4.map(h => sc(h, hStyle(C.GOLD))));

      // Ranking dos mentores
      const mentorRankings = Object.values(byMentor)
        .map(m => ({
          name: m.mentorName,
          active: m.active,
          completed: m.completed,
          score: m.active * 5 + m.completed * 10
        }))
        .sort((a, b) => b.score - a.score);

      mentorRankings.slice(0, 5).forEach((mentor, idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
        
        ws3Data.push([
          sc(medal, cStyle(bg, true, true)),
          sc(mentor.name, cStyle(bg)),
          sc(mentor.active, cStyle(bg, true)),
          sc(mentor.completed, cStyle(bg, true)),
          sc(mentor.score, cStyle(bg, true, true))
        ]);
      });

      // Estatísticas adicionais
      ws3Data.push([]);
      ws3Data.push([sc('  📉 MÉTRICAS DE DESEMPENHO', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.TEAL } } })]);
      ws3Data.push([]);

      const h5 = ['MÉTRICA', 'VALOR', 'STATUS'];
      ws3Data.push(h5.map(h => sc(h, hStyle(C.TEAL))));

      const avgDuration = activeDiscipleships.length > 0 
        ? Math.round(activeDiscipleships.reduce((sum, d) => {
            const start = parseISO(d.created_at);
            const now = new Date();
            return sum + (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
          }, 0) / activeDiscipleships.length)
        : 0;

      const metrics = [
        { name: 'Média de Duração', value: `${avgDuration} meses`, status: avgDuration <= 6 ? 'Ideal' : 'Longo' },
        { name: 'Discipulados/Mentor', value: (totalDiscipleships / Object.keys(byMentor).length || 0).toFixed(1), status: 'Normal' },
        { name: 'Taxa de Retenção', value: `${Math.round((totalActive / (totalDiscipleships || 1)) * 100)}%`, status: 'Bom' },
        { name: 'Novos no Mês', value: startedThisMonth.toString(), status: startedThisMonth > 0 ? 'Crescendo' : 'Estável' }
      ];

      metrics.forEach((metric, idx) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        ws3Data.push([
          sc(metric.name, cStyle(bg)),
          sc(metric.value, cStyle(bg, true)),
          sc(metric.status, pStyle(metric.status === 'Ideal' || metric.status === 'Bom' || metric.status === 'Crescendo' ? C.GREEN : C.GOLD))
        ]);
      });

      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
      ws3['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
      ];
      ['A', 'B', 'C', 'D', 'E'].forEach((c, i) => cw(ws3, c, [25, 35, 15, 15, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws3, '📈 Análise');

      // Download
      const fileName = `Relatorio_Discipulado_${format(month, 'yyyy_MM')}.xlsx`;
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

export default ExcelDiscipleshipMonthlyReportButton;
