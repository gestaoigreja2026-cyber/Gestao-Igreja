-- Adicionar church_id à tabela de discipulado para isolamento multi-tenant
-- ATENÇÃO: Só execute se a tabela "discipleships" existir no seu banco.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discipleships') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'discipleships' AND column_name = 'church_id'
        ) THEN
            ALTER TABLE discipleships ADD COLUMN church_id UUID REFERENCES churches(id);
        END IF;
    END IF;
END $$;

-- Atualizar RLS (só se discipleships existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discipleships') THEN
        ALTER TABLE discipleships ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Tenant isolation for discipleships" ON discipleships;
        CREATE POLICY "Tenant isolation for discipleships" ON discipleships
        FOR ALL USING (
            church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
        );
    END IF;
END $$;
