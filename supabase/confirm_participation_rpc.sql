-- ==========================================
-- RPCs PARA GESTÃO DE ESCALAS (LINK PÚBLICO)
-- ==========================================

-- 1. Obter detalhes da escala sem login (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_scale_details_public(scale_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'member_name', m.name,
        'event_title', e.title,
        'event_date', e.date,
        'event_time', e.time::text,
        'role', s.role,
        'confirmed', s.confirmed,
        'declined', COALESCE(s.declined, false)
    ) INTO result
    FROM service_scales s
    JOIN members m ON s.member_id = m.id
    JOIN events e ON s.event_id = e.id
    WHERE s.id = scale_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Confirmar ou Recusar participação (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION confirm_participation(scale_id UUID, p_confirmed BOOLEAN)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_member_name TEXT;
    v_event_title TEXT;
    v_event_date DATE;
    v_event_time TIME;
    v_role TEXT;
    v_church_id UUID;
    v_admin_record RECORD;
BEGIN
    -- Verificar se a escala existe e obter dados
    SELECT 
        m.name, e.title, e.date, e.time, s.role, e.church_id
    INTO 
        v_member_name, v_event_title, v_event_date, v_event_time, v_role, v_church_id
    FROM service_scales s
    JOIN members m ON s.member_id = m.id
    JOIN events e ON s.event_id = e.id
    WHERE s.id = scale_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Escala não encontrada');
    END IF;

    -- Atualizar status
    IF p_confirmed THEN
        UPDATE service_scales 
        SET confirmed = true, declined = false 
        WHERE id = scale_id;
        
        -- Opcional: Notificar confirmação (menos crítico que recusa)
    ELSE
        UPDATE service_scales 
        SET confirmed = false, declined = true 
        WHERE id = scale_id;

        -- NOTIFICAR ADMINISTRADORES SOBRE A RECUSA
        -- Busca administradores e secretários da mesma igreja
        FOR v_admin_record IN (
            SELECT id FROM profiles 
            WHERE church_id = v_church_id 
            AND role IN ('admin', 'secretario', 'lider_ministerio')
        ) LOOP
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_admin_record.id,
                'Escala Recusada',
                v_member_name || ' não poderá participar como ' || v_role || ' no evento ' || v_event_title || '.',
                'warning',
                '/eventos?tab=escalas'
            );
        END LOOP;
    END IF;

    RETURN json_build_object(
        'success', true,
        'action', CASE WHEN p_confirmed THEN 'confirmed' ELSE 'declined' END,
        'member_name', v_member_name,
        'event_title', v_event_title,
        'event_date', v_event_date,
        'event_time', (v_event_time::text),
        'role', v_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION get_scale_details_public(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_participation(UUID, BOOLEAN) TO anon, authenticated;
