/**
 * Utilitário para exportar dados em CSV (LGPD e auditoria)
 * Suporta membros, relatórios e financeiro.
 */

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface CsvExportOptions {
  filename?: string;
  delimiter?: string;
  bom?: boolean;
}

/**
 * Exporta array de objetos para CSV e faz download.
 * @param rows - Array de objetos (chaves viram colunas)
 * @param options - Nome do arquivo, delimitador, BOM para Excel
 */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  options: CsvExportOptions = {}
): void {
  const { filename = 'export.csv', delimiter = ',', bom = true } = options;

  if (rows.length === 0) {
    downloadCsv(bom ? '\uFEFF\n' : '\n', filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvValue).join(delimiter);
  const bodyLines = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(delimiter)
  );
  const content = bom
    ? '\uFEFF' + headerLine + '\n' + bodyLines.join('\n')
    : headerLine + '\n' + bodyLines.join('\n');

  downloadCsv(content, filename);
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.csv$/i, '') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Gera nome de arquivo com timestamp para membros */
export function membersExportFilename(): string {
  return `membros_${new Date().toISOString().slice(0, 10)}.csv`;
}

/** Gera nome de arquivo com timestamp para financeiro */
export function financialExportFilename(): string {
  return `financeiro_${new Date().toISOString().slice(0, 10)}.csv`;
}

/** Gera nome de arquivo com timestamp para relatório */
export function reportExportFilename(prefix: string): string {
  return `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
}
