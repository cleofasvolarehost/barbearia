CREATE OR REPLACE FUNCTION public.create_establishment_and_promote(
  p_name TEXT,
  p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_establishment_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- 1. Insert Establishment
  INSERT INTO public.establishments (owner_id, name, slug)
  VALUES (v_user_id, p_name, p_slug)
  RETURNING id INTO v_establishment_id;

  -- 2. Promote User to 'owner' (FIXED: was 'dono')
  UPDATE public.usuarios
  SET tipo = 'owner'
  WHERE id = v_user_id;

  RETURN v_establishment_id;
END;
$$;
