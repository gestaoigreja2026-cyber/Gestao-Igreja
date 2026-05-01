-- Tabela para apresentação de pastores da igreja
CREATE TABLE IF NOT EXISTS church_pastors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  photo_url TEXT,
  bio TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_church_pastors_church_id ON church_pastors(church_id);

ALTER TABLE church_pastors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "church_pastors_select" ON church_pastors;
CREATE POLICY "church_pastors_select" ON church_pastors
  FOR SELECT USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "church_pastors_insert" ON church_pastors;
CREATE POLICY "church_pastors_insert" ON church_pastors
  FOR INSERT WITH CHECK (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'secretario', 'superadmin'))
  );

DROP POLICY IF EXISTS "church_pastors_update" ON church_pastors;
CREATE POLICY "church_pastors_update" ON church_pastors
  FOR UPDATE USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'secretario', 'superadmin'))
  );

DROP POLICY IF EXISTS "church_pastors_delete" ON church_pastors;
CREATE POLICY "church_pastors_delete" ON church_pastors
  FOR DELETE USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pastor', 'secretario', 'superadmin'))
  );
