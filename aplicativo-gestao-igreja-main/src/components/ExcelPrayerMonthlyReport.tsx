import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { type PrayerRequest } from '@/services/prayerRequests.service';
import { churchesService } from '@/services/churches.service';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const C = { GREEN: '10B981', ORANGE: 'F59E0B', BLUE: '3B82F6', INDIGO: '6366F1', WHITE: 'FFFFFF', GRAY: 'F3F4F6', TEXT: '1F2937' };

const sc = (v: any, s: any) => ({ v, s });
const hStyle = (c: string) => ({ font: { bold: true, color: { rgb: C.WHITE }, sz: 10 }, fill: { fgColor: { rgb: c } }, alignment: { horizontal: 'center' } });
const cStyle = (bg: string, center = false) => ({ font: { sz: 10, color: { rgb: C.TEXT } }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: center ? 'center' : 'left', wrapText: true } });
const tStyle = (c: string) => ({ font: { bold: true, color: { rgb: C.WHITE }, sz: 16 }, fill: { fgColor: { rgb: c } }, alignment: { horizontal: 'center' } });
const cw = (ws: any, col: string, w: number) => { if (!ws['!cols']) ws['!cols'] = []; ws['!cols'][XLSX.utils.decode_col(col)] = { wch: w }; };

interface Props { requests: PrayerRequest[]; disabled?: boolean; month?: Date; }

export function ExcelPrayerMonthlyReportButton({ requests, disabled, month = new Date() }: Props) {
  const { toast } = useToast();
  const { user, churchId } = useAuth();
  const [loading, setLoading] = useState(false);
  const effectiveChurchId = churchId ?? user?.churchId;

  const handleDownload = async () => {
    setLoading(true);
    try {
      let churchName = 'IGREJA';
      if (effectiveChurchId) {
        const church = await churchesService.getById(effectiveChurchId);
        if (church && 'name' in church && church.name) churchName = church.name.toUpperCase();
      }

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthlyRequests = requests.filter((r: PrayerRequest) => {
        const d = r.created_at ? parseISO(r.created_at) : null;
        return d && d >= monthStart && d <= monthEnd;
      });

      const wb = XLSX.utils.book_new();
      const monthName = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

      // ABA 1: RESUMO
      const total = monthlyRequests.length;
      const answered = monthlyRequests.filter((r: PrayerRequest) => r.testimony && r.testimony.trim() !== '').length;
      const pending = total - answered;
      const rate = total > 0 ? Math.round((answered / total) * 100) : 0;

      const ws1Data = [
        [sc(`${churchName} - RELATÓRIO DE ORAÇÕES`, tStyle(C.INDIGO))],
        [sc(`Período: ${monthName}`, { font: { sz: 12, color: { rgb: C.TEXT } }, alignment: { horizontal: 'center' } })],
        [],
        ['RESUMO GERAL'],
        ['Total de Solicitações:', total],
        ['Respondidas:', answered],
        ['Pendentes:', pending],
        ['Taxa de Resposta:', `${rate}%`],
        [],
        ['DATA', 'SOLICITANTE', 'CATEGORIA', 'PEDIDO', 'STATUS', 'RESPONSÁVEL']
      ];

      const sorted = [...monthlyRequests].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      sorted.forEach((r: PrayerRequest, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const date = r.created_at ? format(parseISO(r.created_at), 'dd/MM/yyyy') : '-';
        const status = r.testimony && r.testimony.trim() !== '' ? 'Respondida' : 'Pendente';
        ws1Data.push([
          sc(date, cStyle(bg, true)),
          sc(r.requester_name || 'Anônimo', cStyle(bg)),
          sc((r.category || 'outros').toUpperCase(), cStyle(bg, true)),
          sc((r.content || '').substring(0, 40), cStyle(bg)),
          sc(status, { font: { bold: true, color: { rgb: C.WHITE } }, fill: { fgColor: { rgb: status === 'Respondida' ? C.GREEN : C.ORANGE } }, alignment: { horizontal: 'center' } }),
          sc(r.assigned_to_name || '-', cStyle(bg))
        ]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((c, i) => cw(ws1, c, [12, 25, 15, 40, 15, 20][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '🙏 Orações');

      // ABA 2: POR CATEGORIA
      const cats: Record<string, number> = {};
      monthlyRequests.forEach((r: PrayerRequest) => { const c = r.category || 'outros'; cats[c] = (cats[c] || 0) + 1; });

      const ws2Data = [
        [sc(`${churchName} - ANÁLISE POR CATEGORIA`, tStyle(C.BLUE))],
        [sc(`Período: ${monthName}`, { font: { sz: 12, color: { rgb: C.TEXT } }, alignment: { horizontal: 'center' } })],
        [],
        ['CATEGORIA', 'QUANTIDADE', '% DO TOTAL']
      ];

      Object.entries(cats).forEach(([cat, count], idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.GRAY;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        ws2Data.push([sc(cat.toUpperCase(), cStyle(bg)), sc(count, cStyle(bg, true)), sc(`${pct}%`, cStyle(bg, true))]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }];
      ['A', 'B', 'C'].forEach((c, i) => cw(ws2, c, [25, 15, 15][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '📊 Categorias');

      XLSX.writeFile(wb, `Relatorio_Oracoes_${format(new Date(), 'yyyy-MM')}.xlsx`);
      toast({ title: '✅ Relatório gerado!', description: `Excel com ${total} orações criado.` });
    } catch (error: any) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={disabled || loading} className="gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      {loading ? 'Gerando...' : 'Relatório Excel'}
    </Button>
  );
}
