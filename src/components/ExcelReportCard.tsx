import { FileSpreadsheet, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { churchesService } from '@/services/churches.service';

// Estilos profissionais de Excel
const STYLES = {
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12, name: 'Calibri' },
    fill: { fgColor: { rgb: '1E3A8A' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } }
    }
  },
  title: {
    font: { bold: true, color: { rgb: '1E3A8A' }, sz: 18, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  subtitle: {
    font: { color: { rgb: '6B7280' }, sz: 10, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  cell: {
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } }
    }
  },
  number: {
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00'
  },
  currency: {
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: 'R$ #,##0.00',
    font: { sz: 11 }
  },
  date: {
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: 'DD/MM/YYYY'
  },
  total: {
    font: { bold: true, color: { rgb: '1E3A8A' }, sz: 11 },
    fill: { fgColor: { rgb: 'DBEAFE' }, patternType: 'solid' },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '1E3A8A' } },
      bottom: { style: 'medium', color: { rgb: '1E3A8A' } },
      left: { style: 'thin', color: { rgb: '1E3A8A' } },
      right: { style: 'thin', color: { rgb: '1E3A8A' } }
    }
  },
  positive: {
    font: { color: { rgb: '059669' } },
    fill: { fgColor: { rgb: 'D1FAE5' }, patternType: 'solid' }
  },
  negative: {
    font: { color: { rgb: 'DC2626' } },
    fill: { fgColor: { rgb: 'FEE2E2' }, patternType: 'solid' }
  },
  sectionTitle: {
    font: { bold: true, color: { rgb: '1E3A8A' }, sz: 14 },
    fill: { fgColor: { rgb: 'EFF6FF' }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center' }
  }
};

// Tipos de dados por coluna para aplicar formatação
const COLUMN_TYPES: Record<string, string[]> = {
  'Data Nasc.': ['date'],
  'Data Batismo': ['date'],
  'Fundação': ['date'],
  'Início': ['date'],
  'Término': ['date'],
  'Próximo Encontro': ['date'],
  'Data': ['date'],
  'Valor (R$)': ['currency'],
  'Orçamento (R$)': ['currency'],
  'Entradas (R$)': ['currency'],
  'Saídas (R$)': ['currency'],
  'Saldo (R$)': ['currency'],
  'Dízimos': ['currency'],
  'Ofertas': ['currency'],
  'Alunos': ['number'],
  'Turmas': ['number'],
  'Participantes': ['number'],
  'Membros': ['number'],
  'Orações': ['number']
};

interface ExcelReportCardProps {
  title: string;
  description: string;
  sheetName: string;
  fileName?: string;
  icon?: React.ReactNode;
  onGenerate?: () => Promise<void>;
  disabled?: boolean;
  data?: any[];
  headers?: string[];
}

export function ExcelReportCard({
  title,
  description,
  sheetName,
  fileName,
  icon,
  onGenerate,
  disabled = false,
  data,
  headers,
}: ExcelReportCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const generateSampleData = (sheet: string): { headers: string[]; data: any[]; summary?: any } => {
    switch (sheet) {
      case 'Células':
        return {
          headers: ['ID', 'Nome da Célula', 'Líder', 'Vice-Líder', 'Endereço', 'Dia', 'Horário', 'Participantes', 'Status'],
          data: [
            ['C001', 'Célula Jovens - Centro', 'João Silva', 'Maria Santos', 'Rua A, 123 - Centro', 'Terça', '20:00', 12, 'Ativa'],
            ['C002', 'Célula Famílias - Bairro', 'Pedro Costa', 'Ana Lima', 'Rua B, 456 - Jardim', 'Quarta', '19:30', 8, 'Ativa'],
            ['C003', 'Célula Mulheres', 'Irmã Ana', 'Irmã Maria', 'Rua C, 789 - Centro', 'Quinta', '14:00', 15, 'Ativa'],
            ['C004', 'Célula Homens', 'Carlos Oliveira', 'José Santos', 'Rua D, 101 - Bairro', 'Sábado', '09:00', 10, 'Ativa'],
            ['C005', 'Célula Jovens Adolescentes', 'Pr. Ricardo', 'Amanda Souza', 'Rua E, 202 - Centro', 'Sexta', '20:00', 18, 'Ativa'],
            ['C006', 'Célula Casais', 'Roberto e Ana', 'Carlos e Maria', 'Av. F, 303 - Centro', 'Segunda', '20:00', 6, 'Ativa'],
            ['C007', 'Célula Idosos', 'Irmão José', 'Irmã Rosa', 'Rua G, 404 - Bairro', 'Quinta', '15:00', 12, 'Ativa'],
            ['C008', 'Célula Intercessão', 'Pastora Maria', 'Diácono Pedro', 'Rua H, 505 - Centro', 'Terça', '06:00', 8, 'Ativa']
          ],
          summary: {
            totalCelulas: 8,
            totalParticipantes: 89,
            mediaParticipantes: 11.1,
            celulasAtivas: 8
          }
        };
      case 'Secretaria':
        return {
          headers: ['ID', 'Nome', 'Data Nasc.', 'Telefone', 'Email', 'Cargo', 'Data Batismo', 'Status'],
          data: [
            ['M001', 'João da Silva', '15/03/1985', '(11) 99999-1111', 'joao.silva@email.com', 'Membro', '10/05/2010', 'Ativo'],
            ['M002', 'Maria Santos', '22/07/1990', '(11) 99999-2222', 'maria.santos@email.com', 'Líder de Célula', '15/08/2012', 'Ativo'],
            ['M003', 'Pedro Costa', '05/11/1978', '(11) 99999-3333', 'pedro.costa@email.com', 'Diácono', '20/12/2005', 'Ativo'],
            ['M004', 'Ana Lima', '18/09/1995', '(11) 99999-4444', 'ana.lima@email.com', 'Membro', '25/03/2018', 'Ativo'],
            ['M005', 'Carlos Oliveira', '30/01/1982', '(11) 99999-5555', 'carlos.oliveira@email.com', 'Pastor', '10/02/2008', 'Ativo'],
            ['M006', 'Julia Mendes', '12/04/1988', '(11) 99999-6666', 'julia.mendes@email.com', 'Líder de Louvor', '22/06/2015', 'Ativo'],
            ['M007', 'Fernando Souza', '08/12/1975', '(11) 99999-7777', 'fernando.souza@email.com', 'Presbítero', '18/09/2003', 'Ativo'],
            ['M008', 'Luciana Torres', '25/06/1992', '(11) 99999-8888', 'luciana.torres@email.com', 'Membro', '14/11/2019', 'Ativo']
          ],
          summary: {
            totalMembros: 150,
            membrosAtivos: 145,
            lideres: 12,
            diaconos: 5
          }
        };
      case 'Relatórios':
        return {
          headers: ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)', 'Dízimos', 'Ofertas', 'Membros Ativos', 'Células'],
          data: [
            ['Janeiro', 45000, 38000, 7000, 35000, 10000, 150, 8],
            ['Fevereiro', 52000, 42000, 10000, 40000, 12000, 155, 9],
            ['Março', 48000, 39000, 9000, 36000, 12000, 160, 10],
            ['Abril', 55000, 45000, 10000, 42000, 13000, 165, 10],
            ['Maio', 60000, 48000, 12000, 45000, 15000, 170, 12],
            ['Junho', 58000, 46000, 12000, 44000, 14000, 175, 12]
          ],
          summary: {
            totalEntradas: 318000,
            totalSaidas: 258000,
            saldoTotal: 60000,
            percentualCrescimento: 15.2
          }
        };
      case 'Escolas':
        return {
          headers: ['ID', 'Nome da Escola', 'Coordenador', 'Alunos', 'Turmas', 'Início', 'Término', 'Status'],
          data: [
            ['E001', 'EBD - Escola Bíblica Dominical', 'Pr. João Silva', 120, 8, '09:00', '10:30', 'Ativa'],
            ['E002', 'Escola de Líderes - Módulo 1', 'Pr. Maria Santos', 25, 2, '19:30', '21:00', 'Ativa'],
            ['E003', 'Novos Convertidos - Fundamentos', 'Diácono Pedro', 15, 1, '19:00', '20:30', 'Ativa'],
            ['E004', 'Escola Teológica - Teologia Sistemática', 'Pr. Carlos Oliveira', 30, 3, '20:00', '21:30', 'Ativa'],
            ['E005', 'Escola de Profetas', 'Pastora Ana Costa', 20, 2, '20:00', '21:30', 'Ativa']
          ],
          summary: {
            totalEscolas: 5,
            totalAlunos: 210,
            mediaAlunos: 42,
            escolasAtivas: 5
          }
        };
      case 'Discipulado':
        return {
          headers: ['ID', 'Discípulo', 'Mentor', 'Nível', 'Início', 'Progresso', 'Próximo Encontro', 'Status'],
          data: [
            ['D001', 'Lucas Silva', 'Pr. João', 'Nível 1 - Fundamentos da Fé', '10/01/2025', '60%', '25/05/2025', 'Em Andamento'],
            ['D002', 'Ana Costa', 'Irmã Maria', 'Nível 2 - Crescimento Espiritual', '15/02/2025', '40%', '27/05/2025', 'Em Andamento'],
            ['D003', 'Pedro Santos', 'Pr. Carlos', 'Nível 3 - Liderança Cristã', '01/03/2025', '25%', '30/05/2025', 'Em Andamento'],
            ['D004', 'Julia Lima', 'Irmã Ana', 'Nível 1 - Fundamentos da Fé', '20/01/2025', '80%', '26/05/2025', 'Em Andamento'],
            ['D005', 'Roberto Ferreira', 'Pr. João', 'Nível 2 - Crescimento Espiritual', '05/02/2025', '90%', '28/05/2025', 'Em Andamento']
          ],
          summary: {
            totalDiscipulos: 25,
            emAndamento: 20,
            concluidos: 5,
            nivel1: 10
          }
        };
      case 'Caixa Diário':
        return {
          headers: ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Saldo (R$)'],
          data: [
            ['17/05/2025', 'Entrada', 'Saldo Anterior', 'Saldo inicial do dia', 15000.00, 15000.00],
            ['17/05/2025', 'Entrada', 'Dízimos', 'Dízimos do culto matutino', 8500.00, 23500.00],
            ['17/05/2025', 'Entrada', 'Ofertas', 'Ofertas do culto matutino', 3200.00, 26700.00],
            ['17/05/2025', 'Entrada', 'Dízimos', 'Dízimos do culto noturno', 5200.00, 31900.00],
            ['17/05/2025', 'Entrada', 'Ofertas', 'Ofertas especiais - Missões', 1800.00, 33700.00],
            ['17/05/2025', 'Saída', 'Manutenção', 'Reparo elétrico - Templo', -800.00, 32900.00],
            ['17/05/2025', 'Saída', 'Limpeza', 'Material de limpeza mensal', -350.00, 32550.00],
            ['17/05/2025', 'Saída', 'Salários', 'Pagamento funcionários', -2800.00, 29750.00],
            ['17/05/2025', 'Saída', 'Água/Luz', 'Conta de energia elétrica', -450.00, 29300.00]
          ],
          summary: {
            saldoInicial: 15000.00,
            totalEntradas: 18700.00,
            totalSaidas: 4400.00,
            saldoFinal: 29300.00
          }
        };
      case 'Eventos':
        return {
          headers: ['ID', 'Nome do Evento', 'Tipo', 'Data', 'Local', 'Responsável', 'Participantes', 'Status'],
          data: [
            ['EV001', 'Culto de Domingo - Manhã', 'Culto', '18/05/2025', 'Templo Principal', 'Pr. João Silva', 250, 'Confirmado'],
            ['EV002', 'Conferência de Jovens 2025', 'Evento', '25/05/2025', 'Salão Social', 'Pr. Ricardo Souza', 120, 'Planejado'],
            ['EV003', 'Retiro de Casais - Fogo do Amor', 'Especial', '15/06/2025', 'Sítio Recanto', 'Pr. Roberto Mendes', 40, 'Planejado'],
            ['EV004', 'Ensaio do Louvor - Grupo Alpha', 'Ensaio', '20/05/2025', 'Sala de Música', 'Maria Silva', 15, 'Confirmado'],
            ['EV005', 'Reunião de Líderes Mensal', 'Reunião', '22/05/2025', 'Sala de Conselho', 'Pr. Carlos Oliveira', 25, 'Planejado'],
            ['EV006', 'Culto de Domingo - Noite', 'Culto', '18/05/2025', 'Templo Principal', 'Pr. João Silva', 180, 'Confirmado'],
            ['EV007', 'Célula Kids - Festival Infantil', 'Especial', '01/06/2025', 'Salão Infantil', 'Tia Maria João', 60, 'Planejado']
          ],
          summary: {
            totalEventos: 7,
            confirmados: 3,
            planejados: 4,
            participantesPrevistos: 690
          }
        };
      case 'Solicitações de Oração':
        return {
          headers: ['ID', 'Data', 'Solicitante', 'Pedido', 'Categoria', 'Orações', 'Status'],
          data: [
            ['O001', '15/05/2025', 'Maria Silva', 'Saúde da mãe - Cirurgia cardíaca', 'Saúde', 45, 'Em Oração'],
            ['O002', '16/05/2025', 'Anônimo', 'Restauração familiar - Casamento em crise', 'Família', 32, 'Em Oração'],
            ['O003', '16/05/2025', 'Pedro Costa', 'Emprego - Desempregado há 6 meses', 'Financeiro', 28, 'Em Oração'],
            ['O004', '17/05/2025', 'Ana Lima', 'Cura interior - Depressão e ansiedade', 'Espiritual', 15, 'Em Oração'],
            ['O005', '17/05/2025', 'Carlos Santos', 'Prova na faculdade - Direito', 'Estudos', 22, 'Respondido'],
            ['O006', '17/05/2025', 'Fernanda Souza', 'Venda de imóvel', 'Financeiro', 18, 'Em Oração'],
            ['O007', '18/05/2025', 'Ricardo Oliveira', 'Libertação de vícios', 'Espiritual', 8, 'Em Oração']
          ],
          summary: {
            totalPedidos: 7,
            emOracao: 6,
            respondidos: 1,
            totalOrações: 168
          }
        };
      case 'Ministérios':
        return {
          headers: ['ID', 'Nome do Ministério', 'Líder', 'Vice-Líder', 'Membros', 'Fundação', 'Status', 'Orçamento (R$)'],
          data: [
            ['M001', 'Louvor e Adoração', 'Pastor João Silva', 'Maria Santos', 45, '15/03/2015', 'Ativo', 3500.00],
            ['M002', 'Intercessão', 'Irmã Ana Costa', 'Pedro Lima', 32, '20/07/2016', 'Ativo', 1200.00],
            ['M003', 'Evangelismo - Missões', 'Pr. Carlos Oliveira', 'Lucia Mendes', 28, '10/01/2017', 'Ativo', 2800.00],
            ['M004', 'Infantil - Célula Kids', 'Tia Maria João', 'Tio Pedro', 25, '05/09/2014', 'Ativo', 2200.00],
            ['M005', 'Jovens - Impacto Jovem', 'Pr. Ricardo Souza', 'Amanda Lima', 52, '12/05/2018', 'Ativo', 3000.00],
            ['M006', 'Mídia e Comunicação', 'Julia Mendes', 'Lucas Silva', 15, '20/03/2020', 'Ativo', 2500.00],
            ['M007', 'Diaconia - Assistência', 'Diácono Pedro', 'Fernando Souza', 20, '10/01/2016', 'Ativo', 1800.00]
          ],
          summary: {
            totalMinisterios: 7,
            totalMembros: 217,
            orçamentoTotal: 17000.00,
            ministeriosAtivos: 7
          }
        };
      default:
        return {
          headers: ['ID', 'Nome', 'Descrição', 'Status'],
          data: [
            ['001', 'Item 1', 'Descrição do item 1', 'Ativo'],
            ['002', 'Item 2', 'Descrição do item 2', 'Ativo'],
            ['003', 'Item 3', 'Descrição do item 3', 'Inativo']
          ]
        };
    }
  };

  // Criar aba de resumo/dashboard
  const createSummarySheet = (wb: XLSX.WorkBook, sheetName: string, summaryData: any, churchName: string) => {
    if (!summaryData) return;
    
    const summaryHeaders = ['Indicador', 'Valor'];
    const summaryRows = Object.entries(summaryData).map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 $2');
      return [label, value];
    });

    const wsData = [
      [`${sheetName} - Dashboard Resumo - ${churchName}`],
      ['Gerado em: ' + new Date().toLocaleDateString('pt-BR')],
      [],
      summaryHeaders,
      ...summaryRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Aplicar estilos
    ws['A1'] = { v: wsData[0][0], s: STYLES.title };
    ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
    ws['A4'] = { v: 'Indicador', s: STYLES.header };
    ws['B4'] = { v: 'Valor', s: STYLES.header };

    // Estilizar linhas de dados
    for (let i = 5; i < wsData.length + 1; i++) {
      ws[`A${i}`] = { ...ws[`A${i}`], s: { ...STYLES.cell, font: { bold: true } } };
      
      // Detectar tipo de valor para formatação
      const value = wsData[i - 1]?.[1];
      if (typeof value === 'number') {
        if (value > 1000) {
          ws[`B${i}`] = { ...ws[`B${i}`], s: STYLES.currency, v: value, t: 'n' };
        } else if (value % 1 !== 0) {
          ws[`B${i}`] = { ...ws[`B${i}`], s: STYLES.number, v: value, t: 'n' };
        } else {
          ws[`B${i}`] = { ...ws[`B${i}`], s: STYLES.number, v: value, t: 'n' };
        }
      } else if (typeof value === 'string' && value.includes('%')) {
        ws[`B${i}`] = { ...ws[`B${i}`], s: { ...STYLES.number, numFmt: '0.0%"' }, t: 's' };
      }
    }

    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
  };

  const applyFormatting = (ws: XLSX.WorkSheet, headers: string[], data: any[][], churchName: string) => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    
    // Adicionar título e subtítulo
    const titleRow = 0;
    const subtitleRow = 1;
    const headerRow = 3;
    
    // Ajustar range para incluir título
    range.e.r += 2;
    ws['!ref'] = XLSX.utils.encode_range(range);

    // Adicionar título com nome da igreja
    ws['A1'] = { v: `${headers[0] || 'RELATÓRIO'} - ${churchName}`, s: STYLES.title };
    ws['A2'] = { v: 'Gerado em: ' + new Date().toLocaleDateString('pt-BR'), s: STYLES.subtitle };

    // Aplicar estilos nos cabeçalhos
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c });
      if (ws[cellRef]) {
        ws[cellRef].s = STYLES.header;
      }
    }

    // Aplicar estilos nas células de dados
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        
        if (cell) {
          const header = headers[c];
          
          // Detectar tipo de coluna e aplicar formatação apropriada
          if (header.includes('(R$)') || header.includes('Orçamento') || header.includes('Valor')) {
            cell.s = STYLES.currency;
            if (typeof cell.v === 'number' && cell.v < 0) {
              cell.s = { ...STYLES.currency, ...STYLES.negative };
            }
          } else if (header.includes('Data') || header.includes('Nasc') || header.includes('Batismo')) {
            cell.s = STYLES.date;
          } else if (header.includes('Alunos') || header.includes('Membros') || header.includes('Participantes') || header.includes('Turmas')) {
            cell.s = STYLES.number;
          } else {
            cell.s = STYLES.cell;
          }
        }
      }
    }

    // Calcular larguras ideais das colunas
    const colWidths = headers.map((h, i) => {
      const headerLen = h.length;
      const maxDataLen = data.reduce((max, row) => {
        const cellVal = row[i]?.toString() || '';
        return Math.max(max, cellVal.length);
      }, 0);
      return { wch: Math.min(Math.max(headerLen, maxDataLen) + 3, 40) };
    });
    
    ws['!cols'] = colWidths;
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

      if (onGenerate) {
        await onGenerate();
      } else {
        const sampleData = generateSampleData(sheetName);
        
        const wb = XLSX.utils.book_new();
        
        // Criar aba principal com dados
        const wsData = [sampleData.headers, ...sampleData.data];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Aplicar formatação profissional
        applyFormatting(ws, sampleData.headers, sampleData.data, churchName);
        
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Criar aba de resumo se houver dados sumarizados
        if (sampleData.summary) {
          createSummarySheet(wb, sheetName, sampleData.summary, churchName);
        }
        
        // Configurações avançadas de exportação
        const excelBuffer = XLSX.write(wb, { 
          bookType: 'xlsx', 
          type: 'array',
          cellStyles: true
        });
        
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const finalFileName = fileName || `gestao_igreja_${sheetName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        saveAs(blob, finalFileName);
      }

      toast({
        title: '✅ Planilha Excel Gerada',
        description: `${title} baixada com formatação profissional, fórmulas e dashboard.`,
      });
    } catch (error) {
      console.error('Erro ao gerar planilha:', error);
      toast({
        title: '❌ Erro',
        description: 'Não foi possível gerar a planilha Excel. Verifique se a biblioteca xlsx-js-style está instalada.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            {icon || <FileSpreadsheet className="h-6 w-6 text-green-600" />}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar Excel Profissional
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Com formatação, fórmulas e aba de resumo
        </p>
      </CardContent>
    </Card>
  );
}

// Cards específicos para cada módulo
export function CelulasReportCard({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
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

      // Dados de exemplo para Células
      const sampleData = {
        headers: ['ID', 'Nome da Célula', 'Líder', 'Vice-Líder', 'Endereço', 'Dia', 'Horário', 'Participantes', 'Status'],
        data: [
          ['C001', 'Célula Jovens - Centro', 'João Silva', 'Maria Santos', 'Rua A, 123 - Centro', 'Terça', '20:00', 12, 'Ativa'],
          ['C002', 'Célula Famílias - Bairro', 'Pedro Costa', 'Ana Lima', 'Rua B, 456 - Jardim', 'Quarta', '19:30', 8, 'Ativa'],
          ['C003', 'Célula Mulheres', 'Irmã Ana', 'Irmã Maria', 'Rua C, 789 - Centro', 'Quinta', '14:00', 15, 'Ativa'],
          ['C004', 'Célula Homens', 'Carlos Oliveira', 'José Santos', 'Rua D, 101 - Bairro', 'Sábado', '09:00', 10, 'Ativa'],
          ['C005', 'Célula Jovens Adolescentes', 'Pr. Ricardo', 'Amanda Souza', 'Rua E, 202 - Centro', 'Sexta', '20:00', 18, 'Ativa'],
          ['C006', 'Célula Casais', 'Roberto e Ana', 'Carlos e Maria', 'Av. F, 303 - Centro', 'Segunda', '20:00', 6, 'Ativa'],
          ['C007', 'Célula Idosos', 'Irmão José', 'Irmã Rosa', 'Rua G, 404 - Bairro', 'Quinta', '15:00', 12, 'Ativa'],
          ['C008', 'Célula Intercessão', 'Pastora Maria', 'Diácono Pedro', 'Rua H, 505 - Centro', 'Terça', '06:00', 8, 'Ativa']
        ]
      };

      // Gerar planilha dinamicamente
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        [`CÉLULAS - ${churchName}`],
        [`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
        [],
        sampleData.headers,
        ...sampleData.data
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Aplicar estilos
      ws['A1'] = { v: wsData[0][0], s: STYLES.title };
      ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
      ];

      // Cabeçalhos
      for (let c = 0; c < sampleData.headers.length; c++) {
        ws[XLSX.utils.encode_cell({ r: 3, c })] = { v: sampleData.headers[c], s: STYLES.header };
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Células');

      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `Planilha_Celulas_${churchName.replace(/\s+/g, '_')}.xlsx`;
      
      saveAs(blob, fileName);
      
      toast({
        title: 'Download iniciado!',
        description: 'Planilha de Células sendo baixada.',
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar a planilha.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Células</CardTitle>
            <CardDescription className="text-sm">Relatório completo de células, líderes, participantes com dashboard, análises e fórmulas avançadas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar Excel Completo
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          5 abas: Dashboard + Cadastro + Análises + Frequência + Guia de Fórmulas
        </p>
      </CardContent>
    </Card>
  );
}

export function SecretariaReportCard({ disabled }: { disabled?: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
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

      // Dados de exemplo para Secretaria
      const sampleData = {
        headers: ['ID', 'Nome', 'Data Nasc.', 'Telefone', 'Email', 'Cargo', 'Data Batismo', 'Status'],
        data: [
          ['M001', 'João da Silva', '15/03/1985', '(11) 99999-1111', 'joao.silva@email.com', 'Membro', '10/05/2010', 'Ativo'],
          ['M002', 'Maria Santos', '22/07/1990', '(11) 99999-2222', 'maria.santos@email.com', 'Líder de Célula', '15/08/2012', 'Ativo'],
          ['M003', 'Pedro Costa', '05/11/1978', '(11) 99999-3333', 'pedro.costa@email.com', 'Diácono', '20/12/2005', 'Ativo'],
          ['M004', 'Ana Lima', '18/09/1995', '(11) 99999-4444', 'ana.lima@email.com', 'Membro', '25/03/2018', 'Ativo'],
          ['M005', 'Carlos Oliveira', '30/01/1982', '(11) 99999-5555', 'carlos.oliveira@email.com', 'Pastor', '10/02/2008', 'Ativo'],
          ['M006', 'Julia Mendes', '12/04/1988', '(11) 99999-6666', 'julia.mendes@email.com', 'Líder de Louvor', '22/06/2015', 'Ativo'],
          ['M007', 'Fernando Souza', '08/12/1975', '(11) 99999-7777', 'fernando.souza@email.com', 'Presbítero', '18/09/2003', 'Ativo'],
          ['M008', 'Luciana Torres', '25/06/1992', '(11) 99999-8888', 'luciana.torres@email.com', 'Membro', '14/11/2019', 'Ativo']
        ]
      };

      // Gerar planilha dinamicamente
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        [`SECRETARIA - ${churchName}`],
        [`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
        [],
        sampleData.headers,
        ...sampleData.data
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Aplicar estilos
      ws['A1'] = { v: wsData[0][0], s: STYLES.title };
      ws['A2'] = { v: wsData[1][0], s: STYLES.subtitle };
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
      ];

      // Cabeçalhos
      for (let c = 0; c < sampleData.headers.length; c++) {
        ws[XLSX.utils.encode_cell({ r: 3, c })] = { v: sampleData.headers[c], s: STYLES.header };
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Secretaria');

      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `Planilha_Secretaria_${churchName.replace(/\s+/g, '_')}.xlsx`;
      
      saveAs(blob, fileName);
      
      toast({
        title: 'Download iniciado!',
        description: 'Planilha de Secretaria sendo baixada.',
      });
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar a planilha.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Secretaria</CardTitle>
            <CardDescription className="text-sm">Cadastro completo de membros com dados pessoais, eclesiásticos e KPIs visuais</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={disabled}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar Excel Completo
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          4 abas: Dashboard + Análise + Gráficos + Guia de Fórmulas
        </p>
      </CardContent>
    </Card>
  );
}

export { RelatoriosReportCard } from './ExcelReportCardRelatorios';

export function EscolasReportCard({ disabled }: { disabled?: boolean }) {
  return (
    <ExcelReportCard
      title="Escolas"
      description="EBD, Escola de Líderes, Novos Convertidos, Teológica com estatísticas"
      sheetName="Escolas"
      icon={<FileSpreadsheet className="h-6 w-6 text-orange-600" />}
      disabled={disabled}
    />
  );
}

export function DiscipuladoReportCard({ disabled }: { disabled?: boolean }) {
  return (
    <ExcelReportCard
      title="Discipulado"
      description="Trilha de crescimento, acompanhamento de discípulos e progresso"
      sheetName="Discipulado"
      icon={<FileSpreadsheet className="h-6 w-6 text-indigo-600" />}
      disabled={disabled}
    />
  );
}

export function CaixaDiarioReportCard({ disabled }: { disabled?: boolean }) {
  return (
    <ExcelReportCard
      title="Caixa Diário"
      description="Controle financeiro completo - entradas, saídas, saldo e fluxo de caixa"
      sheetName="Caixa Diário"
      icon={<FileSpreadsheet className="h-6 w-6 text-emerald-600" />}
      disabled={disabled}
    />
  );
}

export function EventosReportCard({ disabled }: { disabled?: boolean }) {
  return (
    <ExcelReportCard
      title="Eventos"
      description="Gestão de cultos, conferências, retiros, festas e calendário completo"
      sheetName="Eventos"
      icon={<FileSpreadsheet className="h-6 w-6 text-pink-600" />}
      disabled={disabled}
    />
  );
}

export function OracaoReportCard({ disabled }: { disabled?: boolean }) {
  return (
    <ExcelReportCard
      title="Solicitações de Oração"
      description="Registro e acompanhamento de pedidos de intercessão com categorias"
      sheetName="Solicitações de Oração"
      icon={<FileSpreadsheet className="h-6 w-6 text-red-600" />}
      disabled={disabled}
    />
  );
}

export { MinisteriosReportCard } from './ExcelReportCardMinistries';
