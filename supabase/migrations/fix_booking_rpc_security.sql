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
BEGIN
    -- 1. Security & Validation Checks
    
    -- 1.1 Time Traveler Check
    IF p_data < CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em datas passadas.');
    END IF;

    IF p_data = CURRENT_DATE AND p_horario < CURRENT_TIME THEN
         RETURN jsonb_build_object('success', false, 'message', 'Não é possível agendar em horários passados.');
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

    -- 3. Insert Appointment with Establishment ID
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
        p_preco
    )
    RETURNING id INTO v_agendamento_id;

    -- 4. Link Service
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, p_preco);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
