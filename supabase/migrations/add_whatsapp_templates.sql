-- Add whatsapp_templates column to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS whatsapp_templates JSONB DEFAULT '{
  "reminder": "Olá {nome}, seu agendamento é amanhã às {horario}. Confirmado?",
  "rescue": "Oi {nome}, sumiu! Ganhe 10% OFF voltando essa semana.",
  "birthday": "Parabéns {nome}! 🎂 Tem presente esperando por você aqui."
}'::jsonb;
