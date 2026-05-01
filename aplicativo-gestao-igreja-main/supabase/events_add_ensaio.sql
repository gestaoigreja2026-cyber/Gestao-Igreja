-- Adiciona tipo 'ensaio' aos eventos (cultos, ensaios, reuniões)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('culto', 'evento', 'reuniao', 'especial', 'ensaio'));
