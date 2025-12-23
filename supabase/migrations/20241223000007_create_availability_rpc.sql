-- Function to safely fetch busy slots without exposing client data
CREATE OR REPLACE FUNCTION get_barber_appointments(
    p_barber_id UUID,
    p_date DATE
)
RETURNS TABLE (
    start_time TIME,
    duration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.horario as start_time,
        COALESCE(s.duracao_minutos, 30) as duration
    FROM agendamentos a
    LEFT JOIN servicos s ON a.servico_id = s.id
    WHERE a.barbeiro_id = p_barber_id
    AND a.data = p_date
    AND a.status != 'cancelado';
END;
$$;

GRANT EXECUTE ON FUNCTION get_barber_appointments TO anon, authenticated;
