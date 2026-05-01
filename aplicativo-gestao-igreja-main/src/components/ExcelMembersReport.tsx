import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { membersService } from '@/services/members.service';
import { churchesService } from '@/services/churches.service';
import { format } from 'date-fns';

const C = {
  DARK: '1A237E',
  MED: '3949AB',
  LIGHT: 'C5CAE9',
  WHITE: 'FFFFFF',
  GRAY: 'F5F5F5',
  TEXT: '212121'
};

const hStyle = (c: string) => ({
  font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: c } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
});

const cStyle = (bg: string, center = false) => ({
  font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT } },
  fill: { patternType: 'solid', fgColor: { rgb: bg } },
  alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true }
});

const tStyle = (c: string) => ({
  font: { name: 'Arial', bold: true, sz: 20, color: { rgb: C.WHITE } },
  fill: { patternType: 'solid', fgColor: { rgb: c } },
  alignment: { horizontal: 'left', vertical: 'center' }
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

export function ExcelMembersButton({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const effectiveChurchId = user?.churchId;
      if (!effectiveChurchId) {
        toast({ title: 'Erro', description: 'Igreja não identificada.', variant: 'destructive' });
        return;
      }

      toast({ title: '📊 Coletando dados...', description: 'Buscando membros cadastrados.' });

      // Buscar informações da igreja
      let churchName = 'IGREJA';
      let pastorName = '';
      if (effectiveChurchId) {
        try {
          const church = await churchesService.getById(effectiveChurchId);
          if (church?.name) churchName = church.name.toUpperCase();
          if (church?.pastor_name) pastorName = church.pastor_name;
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      // Buscar membros
      const members = await membersService.getAll(effectiveChurchId);

      // Formatar data segura
      const formatDateSafe = (dateStr: any) => {
        if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return format(date, 'dd/MM/yyyy');
        } catch { return ''; }
      };

      // Headers da planilha
      const headers = [
        '#',
        'NOME COMPLETO',
        'DATA NASCIMENTO',
        'ENDEREÇO',
        'E-MAIL',
        'TELEFONE',
        'ESTADO CIVIL',
        'CATEGORIA',
        'NOME IGREJA',
        'NOME PASTOR',
        'FOTO'
      ];

      // Dados
      const dados = members.map((m: any, i: number) => [
        i + 1,
        String(m.name || '').toUpperCase(),
        formatDateSafe(m.birth_date),
        String(m.address || ''),
        String(m.email || '').toLowerCase(),
        String(m.phone || ''),
        String(m.marital_status || ''),
        m.category === 'membro' ? 'MEMBRO' : m.category === 'congregado' ? 'CONGREGADO' : '',
        churchName,
        pastorName,
        m.photo_url ? 'SIM' : 'NÃO'
      ]);

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Criar worksheet com dados completos incluindo título
      const wsData: any[][] = [
        [`${churchName} - CADASTRO DE MEMBROS`],
        [`Relatório gerado em ${format(new Date(), 'dd/MM/yyyy')} | Total: ${members.length} membros`],
        headers,
        ...dados
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Merges para título
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }
      ];

      // Estilos para título e subtítulo
      ws['A1'] = sc(`${churchName} - CADASTRO DE MEMBROS`, tStyle(C.DARK));
      ws['A2'] = sc(`Relatório gerado em ${format(new Date(), 'dd/MM/yyyy')} | Total: ${members.length} membros`, {
        font: { name: 'Arial', sz: 10, color: { rgb: C.DARK }, italic: true },
        fill: { patternType: 'solid', fgColor: { rgb: C.LIGHT } },
        alignment: { horizontal: 'left', vertical: 'center' }
      });

      // Headers
      headers.forEach((h, i) => {
        ws[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.MED));
      });

      // Dados
      dados.forEach((row: any, r: number) => {
        const bg = r % 2 === 0 ? C.WHITE : C.GRAY;
        row.forEach((v: any, c: number) => {
          const val = v === undefined || v === null ? '' : v;
          const cellRef = XLSX.utils.encode_cell({ r: r + 3, c });
          ws[cellRef] = sc(val, cStyle(bg, c === 0 || c === 2 || c === 10 ? 'center' : 'left'));
        });
      });

      // Larguras das colunas
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach((col, i) => {
        const widths = [5, 40, 15, 35, 30, 20, 15, 14, 30, 30, 8];
        cw(ws, col, widths[i]);
      });

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Membros');

      // Download
      XLSX.writeFile(wb, `membros_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);

      toast({ title: '✅ Sucesso!', description: `Planilha exportada com ${members.length} membros.` });
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      toast({ title: 'Erro', description: error.message || 'Erro ao exportar planilha.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={disabled || loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
      Exportar Membros
    </Button>
  );
}

export default ExcelMembersButton;
