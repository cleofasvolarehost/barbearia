CREATE OR REPLACE FUNCTION create_booking(
    p_data DATE,
    p_horario TIME,
    p_barbeiro_id UUID,
    p_servico_id UUID,
    p_usuario_id UUID,
    p_preco DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_agendamento_id UUID;
    v_conflict_count INTEGER;
    v_establishment_id UUID;
    v_final_price DECIMAL;
    v_has_active_subscription BOOLEAN;
    v_now_sp TIMESTAMP; -- Timestamp without time zone (Wall clock time in SP)
BEGIN
    -- 1. Security & Validation Checks
    
    -- Get current wall clock time in Sao Paulo
    v_now_sp := (now() AT TIME ZONE 'America/Sao_Paulo')::timestamp;

    -- 1.1 Time Traveler Check (TimeZone Aware)
    -- Check if Date is in the past (relative to SP)
    IF p_data < v_now_sp::date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em datas passadas.');
    END IF;

    -- Check if Time is in the past (relative to SP) with 10 min tolerance
    -- Only relevant if the Date is Today
    IF p_data = v_now_sp::date THEN
        IF p_horario < (v_now_sp::time - interval '10 minutes') THEN
             RETURN jsonb_build_object('success', false, 'message', 'Horário já passou (tolerância excedida).');
        END IF;
    END IF;

    -- 1.2 Get Establishment from Barber (Single Source of Truth)
    SELECT establishment_id INTO v_establishment_id
    FROM barbeiros
    WHERE id = p_barbeiro_id;

    IF v_establishment_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Barbeiro não encontrado ou sem estabelecimento vinculado.');
    END IF;

    -- 2. Check Availability (Prevent Double Booking)
    SELECT COUNT(*) INTO v_conflict_count
    FROM agendamentos
    WHERE data = p_data 
      AND horario = p_horario 
      AND barbeiro_id = p_barbeiro_id
      AND status NOT IN ('cancelado', 'recusado');

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Horário indisponível');
    END IF;

    -- 3. Membership Logic (Enforce Price on Server Side)
    -- Check if user has active subscription for this establishment
    SELECT EXISTS (
        SELECT 1 FROM client_subscriptions
        WHERE client_id = p_usuario_id
        AND establishment_id = v_establishment_id
        AND status = 'active'
        AND expires_at > NOW()
    ) INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        v_final_price := 0; -- Club Member gets it free (or discounted logic here)
    ELSE
        v_final_price := p_preco;
    END IF;

    -- 4. Insert Appointment with Establishment ID
    INSERT INTO agendamentos (
        data, 
        horario, 
        barbeiro_id, 
        usuario_id, 
        establishment_id,
        status, 
        preco_total
    )
    VALUES (
        p_data, 
        p_horario, 
        p_barbeiro_id, 
        p_usuario_id, 
        v_establishment_id, 
        'pendente', 
        v_final_price
    )
    RETURNING id INTO v_agendamento_id;

    -- 5. Link Service
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, v_final_price);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id, 'final_price', v_final_price);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
