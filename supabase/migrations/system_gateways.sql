-- System Gateways configuration for SaaS billing (includes Iugu)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'gateway_provider'
  ) THEN
    CREATE TYPE public.gateway_provider AS ENUM ('iugu','mercadopago','asaas','efi');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.system_gateways (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider public.gateway_provider NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  account_id text,
  api_token_encrypted bytea,
  encryption_algorithm text NOT NULL DEFAULT 'pgp_sym',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_gateways_one_active_idx
  ON public.system_gateways ((is_active))
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_gateways_set_updated_at ON public.system_gateways;
CREATE TRIGGER system_gateways_set_updated_at
BEFORE UPDATE ON public.system_gateways
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at_timestamp();

COMMENT ON TABLE public.system_gateways IS 'Credenciais e estado do gateway de cobrança do SaaS';
COMMENT ON COLUMN public.system_gateways.api_token_encrypted IS 'Token criptografado com pgcrypto (pgp_sym_encrypt)';
