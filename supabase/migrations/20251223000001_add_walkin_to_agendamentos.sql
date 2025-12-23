ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Drop function first to update signature if needed (though CREATE OR REPLACE handles it if types match, but we are adding params)
-- Overloading works in Postgres, so we might have two functions now.
-- Ideally we replace the old one. To be safe, we can drop the old one if we know the signature.
-- DROP FUNCTION IF EXISTS create_booking(DATE, TIME, UUID, UUID, UUID, DECIMAL);

CREATE OR REPLACE FUNCTION create_booking(
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
    INSERT INTO agendamentos (data, horario, barbeiro_id, usuario_id, status, preco_total, client_name, client_phone)
    VALUES (p_data, p_horario, p_barbeiro_id, p_usuario_id, 'pendente', p_preco, p_client_name, p_client_phone)
    RETURNING id INTO v_agendamento_id;

    -- 3. Link Service (agendamentos_servicos)
    INSERT INTO agendamentos_servicos (agendamento_id, servico_id, preco)
    VALUES (v_agendamento_id, p_servico_id, p_preco);

    RETURN jsonb_build_object('success', true, 'id', v_agendamento_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
