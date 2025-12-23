-- Adicionar Unique Constraint para evitar Double Booking físico
-- Permite apenas UM agendamento ativo por Barbeiro/Dia/Horário
-- Ignora agendamentos cancelados ou recusados

CREATE UNIQUE INDEX idx_unique_booking_slot 
ON agendamentos (barbeiro_id, data, horario) 
WHERE status NOT IN ('cancelado', 'recusado');
