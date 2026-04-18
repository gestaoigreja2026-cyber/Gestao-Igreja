import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      toast({ title: '📊 Coletando dados...', description: 'Buscando informações de todos os módulos.' });

      const [members, ministries, cells, schools, discipleships, transactions, assets, prayers, budgets] = await Promise.all([
        membersService.getAll().catch(() => []),
        ministriesService.getAll().catch(() => []),
        cellsService.getAll().catch(() => []),
        schoolsService.getAll().catch(() => []),
        discipleshipService.getAll().catch(() => []),
        financialService.list().catch(() => []),
        assetsService.getAssets().catch(() => []),
        prayerRequestsService.list().catch(() => []),
        budgetsService.listByMonth(format(new Date(), 'yyyy-MM')).catch(() => []),
      ]);

      const cellReports = await cellsService.getAllReports().catch(() => []);
      const wb = XLSX.utils.book_new();

      // Dashboard
      const ws0 = XLSX.utils.aoa_to_sheet([[]]);
      ws0['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }];
      ws0['A1'] = sc('  ✝  SISTEMA DE GESTÃO ECLESIÁSTICA', tStyle(C.DARK));
      ws0['A2'] = sc('   Dashboard Geral · ' + format(new Date(), 'dd/MM/yyyy'), sStyle(C.ACCENT));
      
      const am = members?.filter((m: any) => m.status === 'active').length || 0;
      const ac = cells?.filter((c: any) => c.status === 'active').length || 0;
      const ap = prayers?.filter((p: any) => p.status === 'open').length || 0;
      
      const kpis = [{ l: 'MEMBROS ATIVOS', v: am, c: C.MED, col: 0 }, { l: 'MINISTÉRIOS', v: ministries?.length || 0, c: C.TEAL, col: 3 }, { l: 'CÉLULAS ATIVAS', v: ac, c: C.PURPLE, col: 6 }, { l: 'PEDIDOS ORAÇÃO', v: ap, c: C.GOLD, col: 9 }];
      kpis.forEach((k) => { const c1 = XLSX.utils.encode_col(k.col); ws0[`${c1}4`] = sc(k.l, klStyle(k.c)); ws0[`${c1}5`] = sc(k.v, kStyle(k.c), 'n'); ws0['!merges'].push({ s: { r: 3, c: k.col }, e: { r: 3, c: k.col + 2 } }, { s: { r: 4, c: k.col }, e: { r: 4, c: k.col + 2 } }); });
      
      ws0['A9'] = sc('ÍNDICE DE MÓDULOS', { font: { name: 'Arial', bold: true, sz: 12, color: { rgb: C.WHITE } }, fill: { patternType: 'solid', fgColor: { rgb: C.MED } }, alignment: { horizontal: 'center', vertical: 'center' } });
      ws0['!merges'].push({ s: { r: 8, c: 0 }, e: { r: 8, c: 13 } });
      
      const mods = [['⛪ Ministérios', 'Cadastro de ministérios', C.TEAL, C.TEAL_L], ['🏘 Células', 'Grupos pequenos e líderes', C.PURPLE, C.PURP_L], ['📋 Secretaria', 'Cadastro de membros', C.MED, C.ACCENT], ['📊 Relatórios', 'Indicadores eclesiásticos', C.DARK, C.LIGHT], ['🎓 Escolas', 'Turmas e alunos', C.GREEN, C.GREEN_L], ['📖 Discipulado', 'Acompanhamento de discípulos', C.ORANGE, C.ORANG_L], ['💰 Caixa Diário', 'Financeiro', C.GOLD, C.GOLD_L], ['🏛 Patrimonial', 'Inventário de bens', C.BROWN, C.BROWN_L], ['🙏 Orações', 'Pedidos de oração', C.RED, C.RED_L]];
      mods.forEach((m, i) => { const r = 10 + i; ws0[`A${r}`] = sc(m[0], { font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.WHITE } }, fill: { patternType: 'solid', fgColor: { rgb: m[2] } }, alignment: { horizontal: 'left', vertical: 'center' } }); ws0[`D${r}`] = sc(m[1], { font: { name: 'Arial', sz: 10, color: { rgb: m[2] } }, fill: { patternType: 'solid', fgColor: { rgb: m[3] } }, alignment: { horizontal: 'left', vertical: 'center' } }); ws0['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 2 } }, { s: { r: r - 1, c: 3 }, e: { r: r - 1, c: 13 } }); });
      
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach((c, i) => cw(ws0, c, [18, 12, 12, 40, 12, 12, 18, 12, 12, 20, 12, 12, 12, 12][i]));
      XLSX.utils.book_append_sheet(wb, ws0, '📊 Dashboard');

      // Ministérios
      const h1 = ['MINISTÉRIO', 'LÍDER', 'CONTATO', 'MEMBROS', 'DIA', 'HORÁRIO', 'LOCAL', 'SITUAÇÃO', 'OBS'];
      const d1 = ministries.map((m: any) => [m.name || '', m.leader?.name || '', m.leader?.phone || '', m.member_count || 0, m.meeting_day || '', m.meeting_time || '', m.location || '', m.status === 'active' ? 'Ativo' : 'Inativo', m.description || '']);
      const ws1 = XLSX.utils.aoa_to_sheet([[], [], [], h1, ...d1]);
      ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
      ws1['A1'] = sc('  ✝  MINISTÉRIOS', tStyle(C.TEAL));
      ws1['A2'] = sc('   Cadastro de ministérios', sStyle(C.TEAL_L));
      h1.forEach((h, i) => ws1[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.TEAL)));
      d1.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; row.forEach((v: any, c: number) => { if (c === 7) ws1[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, v === 'Ativo' ? C.GREEN : C.RED)); else if (c === 3) ws1[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws1[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((c, i) => cw(ws1, c, [25, 25, 18, 10, 18, 10, 20, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws1, '⛪ Ministérios');

      // Células
      const h2 = ['CÉLULA', 'LÍDER', 'VICE-LÍDER', 'MEMBROS', 'BAIRRO', 'DIA', 'HORÁRIO', 'SITUAÇÃO', 'MULT.', 'OBS'];
      const d2 = cells.map((c: any) => [c.name || '', c.leader?.name || '', c.vice_leader?.name || '', c.member_count || 0, c.neighborhood || '', c.meeting_day || '', c.meeting_time || '', c.status === 'active' ? 'Ativa' : c.status === 'formation' ? 'Em formação' : 'Inativa', c.multiplication ? 'Sim' : 'Não', c.notes || '']);
      const ws2 = XLSX.utils.aoa_to_sheet([[], [], [], h2, ...d2]);
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws2['A1'] = sc('  ✝  CÉLULAS', tStyle(C.PURPLE));
      ws2['A2'] = sc('   Grupos pequenos e líderes', sStyle(C.PURP_L));
      h2.forEach((h, i) => ws2[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.PURPLE)));
      d2.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const sm: any = { 'Ativa': C.GREEN, 'Em formação': C.GOLD, 'Inativa': C.RED }; row.forEach((v: any, c: number) => { if (c === 7) ws2[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, sm[v] || C.TEXT)); else if (c === 3 || c === 8) ws2[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws2[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws2, c, [22, 22, 22, 12, 18, 12, 10, 14, 12, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws2, '🏘 Células');

      // Secretaria
      const h3 = ['Nº', 'NOME', 'DATA NASC.', 'TELEFONE', 'E-MAIL', 'ENDEREÇO', 'BAIRRO', 'BATIZADO?', 'DATA BATISMO', 'SITUAÇÃO', 'MINISTÉRIO', 'CÉLULA', 'DATA CADASTRO', 'OBS'];
      const d3 = members.map((m: any, i: number) => [i + 1, m.name || '', m.birth_date ? format(new Date(m.birth_date), 'dd/MM/yyyy') : '', m.phone || '', m.email || '', m.address || '', m.neighborhood || '', m.baptized ? 'Sim' : 'Não', m.baptism_date ? format(new Date(m.baptism_date), 'dd/MM/yyyy') : '', m.status === 'active' ? 'Membro' : m.status === 'visitor' ? 'Visitante' : m.status === 'child' ? 'Criança' : 'Inativo', m.ministry?.name || '', m.cell?.name || '', m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : '', m.notes || '']);
      const ws3 = XLSX.utils.aoa_to_sheet([[], [], [], h3, ...d3]);
      ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }];
      ws3['A1'] = sc('  ✝  SECRETARIA', tStyle(C.MED));
      ws3['A2'] = sc('   Cadastro de membros', sStyle(C.ACCENT));
      h3.forEach((h, i) => ws3[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.MED)));
      d3.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Membro': C.GREEN, 'Visitante': C.GOLD, 'Criança': C.PURPLE, 'Inativo': C.RED }; row.forEach((v: any, c: number) => { if (c === 9) ws3[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, st[v] || C.TEXT)); else if (c === 0) ws3[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws3[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, c === 7 || c === 8)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach((c, i) => cw(ws3, c, [6, 30, 13, 16, 25, 28, 16, 10, 13, 12, 22, 18, 14, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws3, '📋 Secretaria');

      // Escolas
      const h5 = ['TURMA', 'ALUNO', 'CPF/RG', 'DATA MATR.', 'PROFESSOR', 'AULAS', 'PRESENÇAS', 'FREQ %', 'SITUAÇÃO', 'CERTIFICADO', 'OBS'];
      const d5: any[] = []; schools.forEach((s: any) => s.students?.forEach((st: any) => d5.push([s.name || '', st.name || '', st.document || '', st.enrollment_date ? format(new Date(st.enrollment_date), 'dd/MM/yyyy') : '', s.teacher?.name || '', st.classes_given || 0, st.presences || 0, st.classes_given ? st.presences / st.classes_given : 0, st.status === 'active' ? 'Ativa' : 'Concluída', st.certificate_status || 'Pendente', st.notes || ''])));
      const ws5 = XLSX.utils.aoa_to_sheet([[], [], [], h5, ...d5]);
      ws5['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
      ws5['A1'] = sc('  ✝  ESCOLAS', tStyle(C.GREEN));
      ws5['A2'] = sc('   Turmas e alunos', sStyle(C.GREEN_L));
      h5.forEach((h, i) => ws5[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.GREEN)));
      d5.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Ativa': C.GREEN, 'Concluída': C.MED }; row.forEach((v: any, c: number) => { if (c === 7) { const cell = sc(v, cStyle(bg, true), 'n'); cell.z = '0.0%'; ws5[XLSX.utils.encode_cell({ r: r + 4, c })] = cell; } else if (c === 8) ws5[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, st[v] || C.TEXT)); else if (c >= 5 && c <= 7) ws5[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws5[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach((c, i) => cw(ws5, c, [22, 28, 14, 12, 22, 10, 10, 10, 12, 12, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws5, '🎓 Escolas');

      // Discipulado
      const h6 = ['DISCÍPULO', 'MENTOR', 'INÍCIO', 'ETAPA', 'MÓDULOS', 'TOTAL', 'PROGRESSO %', 'PRÓX. ENCONTRO', 'STATUS', 'NOTAS'];
      const d6 = discipleships.map((d: any) => [d.disciple?.name || '', d.mentor?.name || '', d.start_date ? format(new Date(d.start_date), 'dd/MM/yyyy') : '', d.current_stage || '', d.modules_completed || 0, d.total_modules || 6, d.total_modules ? d.modules_completed / d.total_modules : 0, d.next_meeting ? format(new Date(d.next_meeting), 'dd/MM/yyyy') : '', d.status === 'completed' ? 'Concluído' : d.status === 'active' ? 'Em andamento' : 'Pausado', d.notes || '']);
      const ws6 = XLSX.utils.aoa_to_sheet([[], [], [], h6, ...d6]);
      ws6['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws6['A1'] = sc('  ✝  DISCIPULADO', tStyle(C.ORANGE));
      ws6['A2'] = sc('   Acompanhamento de discípulos', sStyle(C.ORANG_L));
      h6.forEach((h, i) => ws6[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.ORANGE)));
      d6.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Concluído': C.GREEN, 'Em andamento': C.GOLD, 'Pausado': C.RED }; row.forEach((v: any, c: number) => { if (c === 6) { const cell = sc(v, cStyle(bg, true), 'n'); cell.z = '0%'; ws6[XLSX.utils.encode_cell({ r: r + 4, c })] = cell; } else if (c === 8) ws6[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, st[v] || C.TEXT)); else if (c >= 4 && c <= 6) ws6[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws6[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws6, c, [25, 25, 12, 25, 12, 10, 12, 14, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws6, '📖 Discipulado');

      // Caixa Diário
      const h7 = ['DATA', 'DESCRIÇÃO', 'CATEGORIA', 'TIPO', 'VALOR (R$)', 'RESPONSÁVEL', 'FORMA', 'COMPROVANTE', 'SALDO', 'OBS'];
      let saldo = 0; const d7 = transactions.map((t: any) => { const v = t.amount || 0; if (t.type === 'income') saldo += v; else saldo -= v; return [t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '', t.description || '', t.category || '', t.type === 'income' ? 'Entrada' : 'Saída', t.type === 'income' ? v : -v, t.responsible?.name || '', t.payment_method || '', t.receipt_number || '', saldo, t.notes || '']; });
      const ws7 = XLSX.utils.aoa_to_sheet([[], [], [], h7, ...d7]);
      ws7['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws7['A1'] = sc('  ✝  CAIXA DIÁRIO', { font: { name: 'Arial', bold: true, sz: 20, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: C.GOLD } }, alignment: { horizontal: 'left', vertical: 'center' } });
      ws7['A2'] = sc('   Controle financeiro', sStyle(C.GOLD_L));
      h7.forEach((h, i) => ws7[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, { font: { name: 'Arial', bold: true, sz: 11, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: C.GOLD } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }));
      d7.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; row.forEach((v: any, c: number) => { if (c === 4 || c === 8) { const cell = sc(v, c === 8 ? { font: { name: 'Arial', bold: true, sz: 10, color: { rgb: C.DARK } }, fill: { patternType: 'solid', fgColor: { rgb: bg } }, alignment: { horizontal: 'right', vertical: 'center' } } : cStyle(bg, false), 'n'); cell.z = 'R$ #,##0.00'; ws7[XLSX.utils.encode_cell({ r: r + 4, c })] = cell; } else if (c === 3) ws7[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, v === 'Entrada' ? C.GREEN : C.RED)); else ws7[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, c >= 5 && c <= 7)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws7, c, [13, 32, 18, 12, 15, 20, 12, 14, 15, 25][i]));
      XLSX.utils.book_append_sheet(wb, ws7, '💰 Caixa');

      // Patrimônio
      const h8 = ['CÓDIGO', 'DESCRIÇÃO', 'CATEGORIA', 'DATA AQUIS.', 'NF', 'VALOR (R$)', 'VALOR ATUAL', 'SITUAÇÃO', 'LOCAL', 'RESPONSÁVEL', 'MANUTENÇÃO', 'OBS'];
      const d8 = assets.map((a: any) => [a.code || '', a.name || '', a.category || '', a.acquisition_date ? format(new Date(a.acquisition_date), 'dd/MM/yyyy') : '', a.invoice_number || '', a.value || 0, a.current_value || 0, a.status || 'Ativo', a.location || '', a.responsible?.name || '', a.next_maintenance ? format(new Date(a.next_maintenance), 'dd/MM/yyyy') : '', a.notes || '']);
      const ws8 = XLSX.utils.aoa_to_sheet([[], [], [], h8, ...d8]);
      ws8['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
      ws8['A1'] = sc('  ✝  PATRIMÔNIO', tStyle(C.BROWN));
      ws8['A2'] = sc('   Inventário de bens', sStyle(C.BROWN_L));
      h8.forEach((h, i) => ws8[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.BROWN)));
      d8.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Ativo': C.GREEN, 'Manutenção': C.GOLD, 'Baixado': C.RED }; row.forEach((v: any, c: number) => { if (c === 5 || c === 6) { const cell = sc(v, cStyle(bg, true), 'n'); cell.z = 'R$ #,##0.00'; ws8[XLSX.utils.encode_cell({ r: r + 4, c })] = cell; } else if (c === 7) ws8[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, st[v] || C.TEXT)); else ws8[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, c === 0 || c === 3)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((c, i) => cw(ws8, c, [14, 32, 16, 13, 12, 16, 16, 14, 18, 20, 14, 30][i]));
      XLSX.utils.book_append_sheet(wb, ws8, '🏛 Patrimônio');

      // Orações
      const h9 = ['Nº', 'DATA', 'SOLICITANTE', 'CONTATO', 'PEDIDO', 'CATEGORIA', 'STATUS', 'RESPONSÁVEL', 'RETORNO', 'TESTEMUNHO'];
      const d9 = prayers.map((p: any, i: number) => [i + 1, p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy') : '', p.requester_name || '', p.requester_contact || '', p.request || '', p.category || '', p.status === 'open' ? 'Aberto' : p.status === 'in_progress' ? 'Em oração' : p.status === 'answered' ? 'Respondido' : 'Arquivado', p.responsible?.name || '', p.response_date ? format(new Date(p.response_date), 'dd/MM/yyyy') : '', p.testimony || '']);
      const ws9 = XLSX.utils.aoa_to_sheet([[], [], [], h9, ...d9]);
      ws9['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }];
      ws9['A1'] = sc('  ✝  ORAÇÕES', tStyle(C.RED));
      ws9['A2'] = sc('   Pedidos de oração', sStyle(C.RED_L));
      h9.forEach((h, i) => ws9[XLSX.utils.encode_cell({ r: 3, c: i })] = sc(h, hStyle(C.RED)));
      d9.forEach((row: any, r: number) => { const bg = r % 2 === 0 ? C.WHITE : C.GRAY; const st: any = { 'Aberto': C.RED, 'Em oração': C.GOLD, 'Respondido': C.GREEN }; row.forEach((v: any, c: number) => { if (c === 6) ws9[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, bStyle(bg, st[v] || C.TEXT)); else if (c === 0) ws9[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, true), 'n'); else ws9[XLSX.utils.encode_cell({ r: r + 4, c })] = sc(v, cStyle(bg, c === 1 || c === 6 || c === 8)); }); });
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach((c, i) => cw(ws9, c, [6, 12, 22, 16, 40, 14, 14, 20, 14, 38][i]));
      XLSX.utils.book_append_sheet(wb, ws9, '🙏 Orações');

      // Download
      XLSX.writeFile(wb, `Gestao_Eclesiastica_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: '✅ Planilha gerada!', description: 'Arquivo Excel com 10 abas baixado com sucesso.' });
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
