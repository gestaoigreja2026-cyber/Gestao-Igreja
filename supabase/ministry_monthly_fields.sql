-- Adiciona campos de atividade mensal ao gerenciamento de ministérios
-- Número de reuniões e relatório da atividade mensal

ALTER TABLE ministries ADD COLUMN IF NOT EXISTS meetings_count integer DEFAULT 0;
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS monthly_activity_report text;

COMMENT ON COLUMN ministries.meetings_count IS 'Número de reuniões no período (mês)';
COMMENT ON COLUMN ministries.monthly_activity_report IS 'Relatório da atividade mensal do ministério';
