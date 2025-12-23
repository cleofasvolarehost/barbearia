-- Force ownership of the check function to postgres to ensure it bypasses RLS
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
    AND tipo = 'super_admin'
  );
$$;

-- IMPORTANT: This ensures the function runs as Superuser, ignoring RLS on 'usuarios'
ALTER FUNCTION public.check_is_super_admin() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.check_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_is_super_admin() TO anon;

-- Re-apply policies
DROP POLICY IF EXISTS "Super Admin Manage All Users" ON public.usuarios;
CREATE POLICY "Super Admin Manage All Users" ON public.usuarios
    FOR ALL
    USING (check_is_super_admin());

DROP POLICY IF EXISTS "Users can manage own data" ON public.usuarios;
CREATE POLICY "Users can manage own data" ON public.usuarios
    FOR ALL
    USING (auth.uid() = id);
