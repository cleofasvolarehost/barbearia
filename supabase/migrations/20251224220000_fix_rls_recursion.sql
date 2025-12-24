-- Resolve RLS recursion on usuarios/agendamentos by using SECURITY DEFINER helpers

-- 1. Helper functions that bypass RLS explicitly
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  result text;
BEGIN
  SELECT tipo INTO result
  FROM public.usuarios
  WHERE id = auth.uid();

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_shop_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  result uuid[];
BEGIN
  SELECT array_agg(id) INTO result
  FROM public.establishments
  WHERE owner_id = auth.uid();

  IF result IS NULL THEN
    result := '{}';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_shop_ids() TO authenticated;

-- 2. Rebuild usuarios policies without recursive checks
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Self Read" ON public.usuarios;
DROP POLICY IF EXISTS "Self Update" ON public.usuarios;
DROP POLICY IF EXISTS "Self Insert" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Owner can view shop clients" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin sees all" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;

CREATE POLICY "Self Read" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Self Update" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Self Insert" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner can view shop clients" ON public.usuarios
FOR SELECT USING (
  establishment_id = ANY(public.current_user_shop_ids())
);

CREATE POLICY "Super Admin sees all" ON public.usuarios
FOR ALL USING (public.current_user_role() = 'super_admin');

-- 3. Rebuild agendamentos policies using helper functions
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
DROP POLICY IF EXISTS "Super Admin full access agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Owner sees all in their shop" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber and Manager Policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber access policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Client sees own appointments" ON public.agendamentos;

CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Owner sees all in their shop" ON public.agendamentos
FOR ALL USING (
  establishment_id = ANY(public.current_user_shop_ids())
);

CREATE POLICY "Barber sees their own or their shop assignments" ON public.agendamentos
FOR SELECT USING (
  auth.uid() = barbeiro_id
  OR (
    public.current_user_role() = 'barber'
    AND barbeiro_id IN (
      SELECT id FROM public.barbeiros WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Client sees own appointments" ON public.agendamentos
FOR ALL USING (auth.uid() = usuario_id);
