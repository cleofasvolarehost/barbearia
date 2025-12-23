-- Add slot_interval_min to establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS slot_interval_min INTEGER DEFAULT 30;

-- Add schedule_config to barbeiros
ALTER TABLE public.barbeiros 
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{"lunchBreak": {"start": "12:00", "end": "13:00"}, "workHours": {"start": "09:00", "end": "19:00"}}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN public.establishments.slot_interval_min IS 'Intervalo em minutos para a grade de agendamento (ex: 30, 60)';
COMMENT ON COLUMN public.barbeiros.schedule_config IS 'Configuração detalhada de horários e pausas do barbeiro';
