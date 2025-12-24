-- Remove recursive Super Admin policy that queries usuarios directly
-- It can trigger infinite recursion when usuarios policies reference establishments.
DROP POLICY IF EXISTS "Super Admin manages establishments" ON public.establishments;

-- Recreate with safe helper if needed
CREATE POLICY "Super Admin manages establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());
