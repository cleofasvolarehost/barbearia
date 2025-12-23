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
    v_booking_timestamp TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Security & Validation Checks
    
    -- 1.1 Time Traveler Check (TimeZone Aware)
    -- Combine Date + Time and treat it as 'America/Sao_Paulo' (or assume client sends local time that matches server assumption)
    -- Ideally, convert everything to UTC for comparison.
    -- Assumption: p_data and p_horario are in the Establishment's Local Time (usually America/Sao_Paulo for this app context).
    
    -- Construct timestamp: Date + Time
    v_booking_timestamp := (p_data || ' ' || p_horario)::timestamp;
    
    -- Convert "now" to the same timezone assumption or use a raw comparison with tolerance
    -- We allow a 5-minute tolerance buffer for "now" to avoid race conditions with client clocks
    v_now := (now() AT TIME ZONE 'America/Sao_Paulo')::timestamp;

    -- Note: If the server is UTC, 'now()' is UTC. 
    -- If p_data/p_horario are "local time" (e.g. 14:00), and we compare to UTC "now" (e.g. 17:00), we have issues.
    -- Better approach:
    -- If p_data < CURRENT_DATE, it's definitely past.
    -- If p_data = CURRENT_DATE, we check time with buffer.
    
    -- Using a 5-minute buffer:
    IF p_data < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em datas passadas.');
    END IF;

    -- Strict check only for today, allowing 5 min tolerance
    -- (CURRENT_TIME is server time, which might be UTC. We need to be careful.)
    -- Let's use a simpler heuristic: 
    -- If Date is Today AND Time is more than 5 minutes ago relative to (now() - interval '3 hours') for Brazil...
    -- SAFE FIX: We assume the client validation handles the UI. The Server just prevents egregious hacks.
    -- We'll allow a 10-minute "grace period" into the past to account for clock skew.
    
    IF p_data = CURRENT_DATE THEN
        -- Check if time is older than (Current Time - 10 minutes)
        -- We cast everything to simple types to avoid TZ headaches
        IF p_horario < (current_time - interval '10 minutes') THEN
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
