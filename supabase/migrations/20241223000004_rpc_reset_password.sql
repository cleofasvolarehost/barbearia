-- Function: admin_reset_password
-- Description: Allows Super Admins to reset any user's password directly via Database RPC.
-- Security: SECURITY DEFINER (runs with high privileges), but checks if caller is super_admin.

CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  requesting_user_id UUID;
  user_role TEXT;
BEGIN
  -- 1. Get current user ID
  requesting_user_id := auth.uid();
  
  -- 2. Check if the requester is a super_admin in public.usuarios
  SELECT tipo INTO user_role 
  FROM public.usuarios 
  WHERE id = requesting_user_id;

  IF user_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Acesso negado: Apenas Super Admins podem resetar senhas.';
  END IF;

  -- 3. Update the password in auth.users
  -- Note: We use pgcrypto's crypt function which Supabase auth uses.
  -- Make sure pgcrypto extension is enabled (usually is by default in Supabase).
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
