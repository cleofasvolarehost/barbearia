-- Add service_categories to establishments table
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{Cabelo,Barba,Combo,Química,Acabamento,Outros}';
