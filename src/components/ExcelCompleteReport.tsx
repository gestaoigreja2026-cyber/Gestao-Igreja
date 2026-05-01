import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { membersService } from '@/services/members.service';
import { ministriesService } from '@/services/ministries.service';
import { cellsService } from '@/services/cells.service';
import { schoolsService } from '@/services/schools.service';
import { discipleshipService } from '@/services/discipleship.service';
import { financialService } from '@/services/financial.service';
import { assetsService } from '@/services/assets.service';
import { prayerRequestsService } from '@/services/prayerRequests.service';
import { budgetsService } from '@/services/budgets.service';
import { churchesService } from '@/services/churches.service';
import { format } from 'date-fns';

const C = { DARK: '1A237E', MED: '3949AB', LIGHT: 'C5CAE9', ACCENT: 'E8EAF6', GOLD: 'F57F17', GOLD_L: 'FFF8E1', GREEN: '2E7D32', GREEN_L: 'E8F5E9', RED: 'C62828', RED_L: 'FFEBEE', TEAL: '00695C', TEAL_L: 'E0F2F1', PURPLE: '6A1B9A', PURP_L: 'F3E5F5', ORANGE: 'E65100', ORANG_L: 'FBE9E7', BROWN: '4E342E', BROWN_L: 'EFEBE9', WHITE: 'FFFFFF', GRAY: 'F5F5F5', TEXT: '212121' };

const hStyle = (c: string) => ({ font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.WHITE } }, fill: { patternType: 'solid', fgColor: { rgb: c } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
const cStyle = (bg: string, center = false) => ({ font: { name: 'Arial', sz: 10, color: { rgb: C.TEXT } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true } });
const tStyle = (c: string) => ({ font: { name: 'Arial', bold: true, sz: 20, color: { rgb: C.WHITE } }, fill: { patternType: 'solid', fgColor: { rgb: c } }, alignment: { horizontal: 'left', vertical: 'center' } });
const sStyle = (c: string) => ({ font: { name: 'Arial', sz: 10, color: { rgb: C.DARK }, italic: true }, fill: { patternType: 'solid', fgColor: { rgb: c } }, alignment: { horizontal: 'left', vertical: 'center' } });
const kStyle = (c: string) => ({ font: { name: 'Arial', bold: true, sz: 28, color: { rgb: c } }, fill: { patternType: 'solid', fgColor: { rgb: C.GRAY } }, alignment: { horizontal: 'center', vertical: 'center' } });
const klStyle = (c: string) => ({ font: { name: 'Arial', bold: true, sz: 9, color: { rgb: C.WHITE } }, fill: { patternType: 'solid', fgColor: { rgb: c } }, alignment: { horizontal: 'center', vertical: 'center' } });
const bStyle = (bg: string, color: string) => ({ font: { name: 'Arial', bold: true, sz: 10, color: { rgb: color } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, alignment: { horizontal: 'center', vertical: 'center' } });

function sc(v: any, s: any, t?: 'n') { const c: any = { v, s }; if (t) c.t = t; return c; }
function cw(ws: any, col: string, w: number) { if (!ws['!cols']) ws['!cols'] = []; ws['!cols'][XLSX.utils.decode_col(col)] = { wch: w }; }

export function ExcelCompleteReportButton({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      toast({ title: '📊 Coletando dados...', description: 'Buscando informações de todos os módulos.' });

      // Buscar informações da igreja
      let churchName = 'IGREJA';
      if (user?.churchId) {
        try {
          const church = await churchesService.getById(user.churchId);
          if (church?.name) churchName = church.name.toUpperCase();
        } catch (e) {
          console.warn('Erro ao buscar dados da igreja:', e);
        }
      }

      const [members, ministries, cells, schools, discipleships, transactions, assets, prayers, budgets] = await Promise.all([
        membersService.getAll(user?.churchId).catch(() => []),
        ministriesService.getAll(user?.churchId).catch(() => []),
        cellsService.getAll(user?.churchId).catch(() => []),
        schoolsService.getAll(user?.churchId).catch(() => []),
        discipleshipService.getAll(user?.churchId).catch(() => []),
        financialService.list(user?.churchId).catch(() => []),
        assetsService.getAssets(user?.churchId).catch(() => []),
        prayerRequestsService.list(user?.churchId).catch(() => []),
        budgetsService.listByMonth(format(new Date(), 'yyyy-MM'), user?.churchId).catch(() => []),
      ]);

      const cellReports = await cellsService.getAllReports().catch(() => []);
      const wb = XLSX.utils.book_new();

      // Ministérios
      const h1 = ['MINISTÉRIO', 'LÍDER', 'CONTATO', 'MEMBROS', 'DIA', 'HORÁRIO', 'LOCAL', 'SITUAÇÃO', 'OBS'];
      const d1 = ministries.map((m: any) => [String(m.name || ''), String(m.leader?.name || ''), String(m.leader?.phone || ''), m.member_count || 0, String(m.meeting_day || ''), String(m.meeting_time || ''), String(m.location || ''), m.status === 'active' ? 'Ativo' : 'Inativo', String(m.description || '')]);
      const ws1Data = [[`${churchName} - MINISTÉRIOS`], ['Cadastro de ministérios'], h1, ...d1];
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
      ws1['A1'] = sc(`${churchName} - MINISTÉRIOS`, tStyle(C.TEAL));
      ws1['A2'] = sc('   Cadastro de ministérios', sStyle(C.TEAL_L));
      h1.forEach((h, i) => ws1[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.TEAL)));
      d1.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 7) ws1[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, val === 'Ativo' ? C.GREEN : C.RED)); else if (c === 3) ws1[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n'); else ws1[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((c, i) => cw(ws1, c, [25, 25, 18, 10, 18, 10, 20, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '⛪ Ministérios');

      // Células
      const h2 = ['CÉLULA', 'LÍDER', 'VICE-LÍDER', 'MEMBROS', 'BAIRRO', 'DIA', 'HORÁRIO', 'SITUAÇÃO', 'MULT.', 'OBS'];
      const d2 = cells.map((c: any) => [String(c.name || ''), String(c.leader?.name || ''), String(c.vice_leader?.name || ''), c.member_count || 0, String(c.neighborhood || ''), String(c.meeting_day || ''), String(c.meeting_time || ''), c.status === 'active' ? 'Ativa' : c.status === 'formation' ? 'Em formação' : 'Inativa', c.multiplication ? 'Sim' : 'Não', String(c.notes || '')]);
      const ws2Data = [[`${churchName} - CÉLULAS`], ['Grupos pequenos e líderes'], h2, ...d2];
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws2['A1'] = sc(`${churchName} - CÉLULAS`, tStyle(C.PURPLE));
      ws2['A2'] = sc('   Grupos pequenos e líderes', sStyle(C.PURP_L));
      h2.forEach((h, i) => ws2[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.PURPLE)));
      d2.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const sm: any = { 'Ativa': C.GREEN, 'Em formação': C.GOLD, 'Inativa': C.RED }; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 7) ws2[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, sm[val] || C.TEXT)); else if (c === 3 || c === 8) ws2[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n'); else ws2[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws2, c, [22, 22, 22, 12, 18, 12, 10, 14, 12, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '🏘 Células');

      // Helper para datas seguras
      const formatDateSafe = (dateStr: any) => {
        if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return format(date, 'dd/MM/yyyy');
        } catch { return ''; }
      };

      // Escolas
      const h5 = ['TURMA', 'ALUNO', 'CPF/RG', 'DATA MATR.', 'PROFESSOR', 'AULAS', 'PRESENÇAS', 'FREQ %', 'SITUAÇÃO', 'CERTIFICADO', 'OBS'];
      const d5: any[] = []; schools.forEach((s: any) => s.students?.forEach((st: any) => d5.push([String(s.name || ''), String(st.name || ''), String(st.document || ''), formatDateSafe(st.enrollment_date), String(s.teacher?.name || ''), st.classes_given || 0, st.presences || 0, st.classes_given ? st.presences / st.classes_given : 0, st.status === 'active' ? 'Ativa' : 'Concluída', String(st.certificate_status || 'Pendente'), String(st.notes || '')])));
      const ws5Data = [[`${churchName} - ESCOLAS`], ['Turmas e alunos'], h5, ...d5];
      const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
      ws5['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
      ws5['A1'] = sc(`${churchName} - ESCOLAS`, tStyle(C.GREEN));
      ws5['A2'] = sc('   Turmas e alunos', sStyle(C.GREEN_L));
      h5.forEach((h, i) => ws5[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.GREEN)));
      d5.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Ativa': C.GREEN, 'Concluída': C.MED }; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 7) { const cell = sc(val, cStyle(bg, true), 'n'); cell.z = '0.0%'; ws5[XLSX.utils.encode_cell({ r: r + 3, c })] = cell; } else if (c === 8) ws5[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, st[val] || C.TEXT)); else if (c >= 5 && c <= 7) ws5[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n'); else ws5[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach((c, i) => cw(ws5, c, [22, 28, 14, 12, 22, 10, 10, 10, 12, 12, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws5, '🎓 Escolas');

      // Discipulado
      const h6 = ['DISCÍPULO', 'MENTOR', 'INÍCIO', 'ETAPA', 'MÓDULOS', 'TOTAL', 'PROGRESSO %', 'PRÓX. ENCONTRO', 'STATUS', 'NOTAS'];
      const d6 = discipleships.map((d: any) => [String(d.disciple?.name || ''), String(d.mentor?.name || ''), formatDateSafe(d.start_date), String(d.current_stage || ''), d.modules_completed || 0, d.total_modules || 6, d.total_modules ? d.modules_completed / d.total_modules : 0, formatDateSafe(d.next_meeting), d.status === 'completed' ? 'Concluído' : d.status === 'active' ? 'Em andamento' : 'Pausado', String(d.notes || '')]);
      const ws6Data = [[`${churchName} - DISCIPULADO`], ['Acompanhamento de discípulos'], h6, ...d6];
      const ws6 = XLSX.utils.aoa_to_sheet(ws6Data);
      ws6['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws6['A1'] = sc(`${churchName} - DISCIPULADO`, tStyle(C.ORANGE));
      ws6['A2'] = sc('   Acompanhamento de discípulos', sStyle(C.ORANG_L));
      h6.forEach((h, i) => ws6[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.ORANGE)));
      d6.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Concluído': C.GREEN, 'Em andamento': C.GOLD, 'Pausado': C.RED }; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 6) { const cell = sc(val, cStyle(bg, true), 'n'); cell.z = '0%'; ws6[XLSX.utils.encode_cell({ r: r + 3, c })] = cell; } else if (c === 8) ws6[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, st[val] || C.TEXT)); else if (c >= 4 && c <= 6) ws6[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n'); else ws6[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws6, c, [25, 25, 12, 25, 12, 10, 12, 14, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws6, '📖 Discipulado');

      // Caixa Diário
      const h7 = ['DATA', 'DESCRIÇÃO', 'CATEGORIA', 'TIPO', 'VALOR (R$)', 'RESPONSÁVEL', 'FORMA', 'COMPROVANTE', 'SALDO', 'OBS'];
      let saldo = 0; const d7 = transactions.map((t: any) => { const v = t.amount || 0; if (t.type === 'income') saldo += v; else saldo -= v; return [formatDateSafe(t.date), String(t.description || ''), String(t.category || ''), t.type === 'income' ? 'Entrada' : 'Saída', t.type === 'income' ? v : -v, String(t.responsible?.name || ''), String(t.payment_method || ''), String(t.receipt_number || ''), saldo, String(t.notes || '')]; });
      const ws7Data = [[`${churchName} - CAIXA DIÁRIO`], ['Controle financeiro'], h7, ...d7];
      const ws7 = XLSX.utils.aoa_to_sheet(ws7Data);
      ws7['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws7['A1'] = sc(`${churchName} - CAIXA DIÁRIO`, { font: { name: 'Arial', bold: true, sz: 20, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: C.GOLD } }, alignment: { horizontal: 'left', vertical: 'center' } });
      ws7['A2'] = sc('   Controle financeiro', sStyle(C.GOLD_L));
      h7.forEach((h, i) => ws7[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, { font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: C.GOLD } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }));
      d7.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 4 || c === 8) { const cell = sc(val, c === 8 ? { font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, alignment: { horizontal: 'right', vertical: 'center' } } : cStyle(bg, false), 'n'); cell.z = 'R$ #,##0.00'; ws7[XLSX.utils.encode_cell({ r: r + 3, c })] = cell; } else if (c === 3) ws7[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, val === 'Entrada' ? C.GREEN : C.RED)); else ws7[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, c >= 5 && c <= 7)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws7, c, [13, 32, 18, 12, 15, 20, 12, 14, 15, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws7, '💰 Caixa');

      // Patrimônio
      const h8 = ['CÓDIGO', 'DESCRIÇÃO', 'CATEGORIA', 'DATA AQUIS.', 'NF', 'VALOR (R$)', 'VALOR ATUAL', 'SITUAÇÃO', 'LOCAL', 'RESPONSÁVEL', 'MANUTENÇÃO', 'OBS'];
      const d8 = assets.map((a: any) => [String(a.code || ''), String(a.name || ''), String(a.category || ''), formatDateSafe(a.acquisitionDate), String(a.invoiceNumber || ''), a.value || 0, a.currentValue || 0, a.status || 'Ativo', String(a.location || ''), String(a.responsible?.name || ''), formatDateSafe(a.nextMaintenanceDate), String(a.notes || '')]);
      const ws8Data = [[`${churchName} - PATRIMÔNIO`], ['Inventário de bens'], h8, ...d8];
      const ws8 = XLSX.utils.aoa_to_sheet(ws8Data);
      ws8['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
      ws8['A1'] = sc(`${churchName} - PATRIMÔNIO`, tStyle(C.BROWN));
      ws8['A2'] = sc('   Inventário de bens', sStyle(C.BROWN_L));
      h8.forEach((h, i) => ws8[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.BROWN)));
      d8.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Ativo': C.GREEN, 'Manutenção': C.GOLD, 'Baixado': C.RED }; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 5 || c === 6) { const cell = sc(val, cStyle(bg, true), 'n'); cell.z = 'R$ #,##0.00'; ws8[XLSX.utils.encode_cell({ r: r + 3, c })] = cell; } else if (c === 7) ws8[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, st[val] || C.TEXT)); else ws8[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, c === 0 || c === 3)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((c, i) => cw(ws8, c, [14, 32, 16, 13, 12, 16, 16, 14, 18, 20, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws8, '🏛 Patrimônio');

      // Orações
      const h9 = ['Nº', 'DATA', 'SOLICITANTE', 'CONTATO', 'PEDIDO', 'CATEGORIA', 'STATUS', 'RESPONSÁVEL', 'TESTEMUNHO'];
      const d9 = prayers.map((p: any, i: number) => [i + 1, formatDateSafe(p.created_at), String(p.requester_name || ''), String(p.contact || ''), String(p.content || ''), String(p.category || ''), p.status === 'pendente' ? 'Pendente' : p.status === 'em_oracao' ? 'Em oração' : p.status === 'respondido' ? 'Respondido' : p.status === 'concluido' ? 'Concluído' : 'Pendente', String(p.assigned_to_name || ''), String(p.testimony || '')]);
      const ws9Data = [[`${churchName} - ORAÇÕES`], ['Pedidos de oração'], h9, ...d9];
      const ws9 = XLSX.utils.aoa_to_sheet(ws9Data);
      ws9['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
      ws9['A1'] = sc(`${churchName} - ORAÇÕES`, tStyle(C.RED));
      ws9['A2'] = sc('   Pedidos de oração', sStyle(C.RED_L));
      h9.forEach((h, i) => ws9[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.RED)));
      d9.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Pendente': C.RED, 'Em oração': C.GOLD, 'Respondido': C.GREEN, 'Concluído': C.TEAL }; row.forEach((v: any, c: number) => { const val = v === undefined || v === null ? '' : v; if (c === 6) ws9[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, bStyle(bg, st[val] || C.TEXT)); else if (c === 0) ws9[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n'); else ws9[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, c === 1 || c === 6)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((c, i) => cw(ws9, c, [6, 12, 22, 16, 40, 14, 14, 20, 38][i]));
      XLSX.utils.book_append_sheet(wb, ws9, '🙏 Orações');

      // Consolidação (Novos Convertidos)
      const consolidacaoMembers = members?.filter((m: any) => m.status === 'visitante') || [];
      const h10 = ['Nº', 'NOME', 'TELEFONE', 'DIA VISITA', 'CULTO', '1ª SEMANA CONTATO', '1ª SEM DATA', '2ª SEMANA CÉLULA', '2ª SEM DATA', '3ª SEMANA CULTO', '3ª SEM DATA', '4ª SEMANA LAR', '4ª SEM DATA', 'BATISMO', 'OBSERVAÇÕES'];
      const d10 = consolidacaoMembers.map((m: any, i: number) => {
        // Parse dados de consolidação do notes (JSON)
        let consData: any = {};
        try {
          if (m.notes && typeof m.notes === 'string' && m.notes.startsWith('{')) {
            consData = JSON.parse(m.notes);
          }
        } catch (e) {
          consData = { observations: String(m.notes || '') };
        }
        const formatDateSafe2 = (dateStr: any) => {
          if (!dateStr || dateStr === 'null' || dateStr === 'undefined' || dateStr === '') return '';
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return format(date, 'dd/MM/yyyy');
          } catch { return ''; }
        };
        return [
          i + 1,
          String(m.name || ''),
          String(m.phone || ''),
          String(consData.visitDay || ''),
          String(consData.visitService || ''),
          String(consData.week1Contact || ''),
          formatDateSafe2(consData.week1Date),
          String(consData.week2InviteCell || ''),
          formatDateSafe2(consData.week2Date),
          String(consData.week3InviteCult || ''),
          formatDateSafe2(consData.week3Date),
          String(consData.week4HomeVisit || ''),
          formatDateSafe2(consData.week4Date),
          formatDateSafe2(consData.baptismDate),
          String(consData.observations || (m.notes && typeof m.notes === 'string' && !m.notes.startsWith('{') ? m.notes : ''))
        ];
      });
      const ws10Data = [[`${churchName} - CONSOLIDAÇÃO`], ['Acompanhamento de novos convertidos - 4 semanas'], h10, ...d10];
      const ws10 = XLSX.utils.aoa_to_sheet(ws10Data);
      ws10['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }];
      ws10['A1'] = sc(`${churchName} - CONSOLIDAÇÃO`, tStyle(C.ORANGE));
      ws10['A2'] = sc('   Acompanhamento de novos convertidos - 4 semanas', sStyle(C.ORANG_L));
      h10.forEach((h, i) => ws10[XLSX.utils.encode_cell({ r: 2, c: i })] = sc(h, hStyle(C.ORANGE)));
      d10.forEach((row: any, r: number) => {
        const bg = r % 2 === 0 ? C.WHITE : C.GRAY;
        row.forEach((v: any, c: number) => {
          const val = v === undefined || v === null ? '' : v;
          if (c === 0) {
            ws10[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, true), 'n');
          } else if (c === 13 && val) {
            // Data de batismo destacada
            ws10[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, { font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.TEAL } }, fill: { patternType: 'solid', fgColor: { rgb: C.TEAL_L } }, alignment: { horizontal: 'center', vertical: 'center' } });
          } else {
            ws10[XLSX.utils.encode_cell({ r: r + 3, c })] = sc(val, cStyle(bg, c >= 6 && c <= 12 && c % 2 === 0)); // Centraliza datas
          }
        });
      });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].forEach((c, i) => cw(ws10, c, [6, 28, 16, 14, 12, 22, 12, 22, 12, 22, 12, 22, 12, 12, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws10, '✨ Consolidação');

      // Download
      XLSX.writeFile(wb, `Gestao_Eclesiastica_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: '✅ Planilha gerada!', description: 'Arquivo Excel com 8 abas baixado com sucesso.' });
    } catch (error: any) {
      toast({ title: '❌ Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={disabled || loading} className="gap-2 h-11 min-h-[44px] text-base px-4 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700">
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
      {loading ? 'Gerando...' : 'Baixar Excel'}
    </Button>
  );
}

export default ExcelCompleteReportButton;
