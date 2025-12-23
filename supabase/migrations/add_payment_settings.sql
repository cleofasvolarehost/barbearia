-- Add payment settings columns to establishments table

ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'hybrid' CHECK (payment_mode IN ('gateway_only', 'manual_only', 'hybrid')),
ADD COLUMN IF NOT EXISTS manual_pix_key text,
ADD COLUMN IF NOT EXISTS allow_pay_at_shop boolean DEFAULT true;

-- Update RLS policies if necessary (usually owner can update their own establishment)
-- The existing policies should cover updates if they allow owners to update their establishment.
