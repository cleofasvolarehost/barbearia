-- Fix Infinite Recursion in RLS Policies
-- We need a SECURITY DEFINER function to bypass RLS when checking permissions

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

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Super Admin Manage All Users" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin Manage All Profiles" ON public.profiles;

-- Create new SAFE policies
-- 1. Users can manage their own data
-- 2. Super Admins can manage everything (via the safe function)

CREATE POLICY "Users can manage own data" ON public.usuarios
    FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "Super Admin Manage All Users" ON public.usuarios
    FOR ALL
    USING (check_is_super_admin());

-- Fix Profiles as well
CREATE POLICY "Profiles self access" ON public.profiles
    FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "Super Admin Manage All Profiles" ON public.profiles
    FOR ALL
    USING (check_is_super_admin());
