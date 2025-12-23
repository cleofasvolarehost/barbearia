ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS api_url TEXT;

DROP FUNCTION IF EXISTS create_booking(DATE, TIME, UUID, UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS create_booking(DATE, TIME, UUID, UUID, UUID, DECIMAL, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_booking_v2(
    p_data DATE,
    p_horario TIME,
    p_barbeiro_id UUID,
    p_servico_id UUID,
    p_usuario_id UUID,
    p_preco DECIMAL,
    p_client_name TEXT DEFAULT NULL,
    p_client_phone TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_agendamento_id UUID;
    v_conflict_count INTEGER;
    v_establishment_id UUID;
    v_final_price DECIMAL;
    v_has_active_subscription BOOLEAN;
BEGIN
    -- 1. Security & Validation Checks
    IF p_data < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em datas passadas.');
    END IF;

    IF p_data = CURRENT_DATE AND p_horario < CURRENT_TIME THEN
         RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em horários passados.');
    END IF;

    -- 2. Get Establishment from Barber (Single Source of Truth)
    SELECT establishment_id INTO v_establishment_id
    FROM barbeiros
    WHERE id = p_barbeiro_id;

    IF v_establishment_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Barbeiro não encontrado ou sem estabelecimento vinculado.');
    END IF;

    -- 3. Check Availability (Prevent Double Booking)
    SELECT COUNT(*) INTO v_conflict_count
    FROM agendamentos
    WHERE data = p_data
      AND horario = p_horario
      AND barbeiro_id = p_barbeiro_id
      AND status NOT IN ('cancelado', 'recusado');

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Horário indisponível');
    END IF;

    -- 4. Membership Logic (Enforce Price on Server Side)
    SELECT EXISTS (
        SELECT 1 FROM client_subscriptions
        WHERE client_id = p_usuario_id
        AND establishment_id = v_establishment_id
        AND status = 'active'
        AND expires_at > NOW()
    ) INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        v_final_price := 0;
    ELSE
        v_final_price := p_preco;
    END IF;

    -- 5. Insert Appointment with Establishment ID
    INSERT INTO agendamentos (
        data,
        horario,
        barbeiro_id,
        usuario_id,
        establishment_id,
        status,
        preco_total,
        client_name,
        client_phone
    )
    VALUES (
        p_data,
        p_horario,
        p_barbeiro_id,
        p_usuario_id,
        v_establishment_id,
        'pendente',
        v_final_price,
        p_client_name,
        p_client_phone
    )
    RETURNING id INTO v_agendamento_id;

    -- 6. Link Service
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, v_final_price);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id, 'final_price', v_final_price);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fetch_bookings_for_reminder(
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
) RETURNS TABLE (
    booking_id UUID,
    establishment_id UUID,
    client_name TEXT,
    client_phone TEXT,
    data DATE,
    horario TIME,
    barber_name TEXT,
    service_name TEXT,
    usuario_id UUID
) AS $$
    SELECT
        a.id,
        a.establishment_id,
        a.client_name,
        a.client_phone,
        a.data,
        a.horario,
        b.nome,
        s.nome,
        a.usuario_id
    FROM agendamentos a
    LEFT JOIN barbeiros b ON b.id = a.barbeiro_id
    LEFT JOIN agendamentos_servicos ags ON ags.agendamento_id = a.id
    LEFT JOIN servicos s ON s.id = ags.servico_id
    WHERE a.status = 'confirmado'
      AND a.reminder_sent IS FALSE
      AND (a.data + a.horario) >= p_from::timestamp
      AND (a.data + a.horario) <= p_to::timestamp;
$$ LANGUAGE sql STABLE;
