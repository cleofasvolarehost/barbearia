-- Add price column to agendamentos_servicos if it doesn't exist
ALTER TABLE public.agendamentos_servicos ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
