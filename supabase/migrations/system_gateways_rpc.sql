-- RPC para upsert seguro de system_gateways com criptografia pgcrypto

CREATE OR REPLACE FUNCTION public.upsert_system_gateway(
  p_provider text,
  p_account_id text,
  p_api_token_plain text,
  p_secret_key text
)
RETURNS public.system_gateways
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.system_gateways;
BEGIN
  INSERT INTO public.system_gateways(provider, account_id, api_token_encrypted, is_active)
  VALUES (
    p_provider::public.gateway_provider,
    p_account_id,
    pgp_sym_encrypt(p_api_token_plain, p_secret_key),
    false
  )
  ON CONFLICT (provider)
  DO UPDATE SET
    account_id = EXCLUDED.account_id,
    api_token_encrypted = EXCLUDED.api_token_encrypted,
    updated_at = now();

  SELECT * INTO v_row FROM public.system_gateways WHERE provider = p_provider::public.gateway_provider;
  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.upsert_system_gateway IS 'Upsert de credenciais com pgp_sym_encrypt para system_gateways';
