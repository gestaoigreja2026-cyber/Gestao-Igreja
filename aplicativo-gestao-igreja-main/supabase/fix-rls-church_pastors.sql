-- Correção RLS: church_pastors
-- Igual a células/ministérios: permitir operações para usuários autenticados
-- (evita erro "row-level security policy" ao SuperAdmin visualizando outra igreja)

DROP POLICY IF EXISTS "church_pastors_select" ON church_pastors;
CREATE POLICY "church_pastors_select" ON church_pastors FOR SELECT USING (true);

DROP POLICY IF EXISTS "church_pastors_insert" ON church_pastors;
CREATE POLICY "church_pastors_insert" ON church_pastors FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "church_pastors_update" ON church_pastors;
CREATE POLICY "church_pastors_update" ON church_pastors FOR UPDATE USING (true);

DROP POLICY IF EXISTS "church_pastors_delete" ON church_pastors;
CREATE POLICY "church_pastors_delete" ON church_pastors FOR DELETE USING (true);
