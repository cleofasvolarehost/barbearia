-- Function to handle booking creation atomically
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
BEGIN
    -- 1. Check Availability (Prevent Double Booking)
    SELECT COUNT(*) INTO v_conflict_count
    FROM agendamentos
    WHERE data = p_data 
      AND horario = p_horario 
      AND barbeiro_id = p_barbeiro_id
      AND status NOT IN ('cancelado', 'recusado');

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Horário indisponível');
    END IF;

    -- 2. Insert Appointment
    INSERT INTO agendamentos (data, horario, barbeiro_id, usuario_id, status, preco_total)
    VALUES (p_data, p_horario, p_barbeiro_id, p_usuario_id, 'pendente', p_preco)
    RETURNING id INTO v_agendamento_id;

    -- 3. Link Service (agendamentos_servicos)
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, p_preco);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
