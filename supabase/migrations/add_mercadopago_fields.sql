-- Add Mercado Pago fields to establishments table
ALTER TABLE public.establishments
ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
ADD COLUMN IF NOT EXISTS mp_public_key TEXT,
ADD COLUMN IF NOT EXISTS accepts_pix BOOLEAN DEFAULT false;
