-- Fix Infinite Recursion by using PLPGSQL and breaking the chain
-- 1. Drop problematic policies to stop the bleeding
DROP POLICY IF EXISTS "Super Admin full access establishments" ON public.establishments;
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Owner can view shop clients" ON public.usuarios;

-- 2. Redefine is_super_admin with PLPGSQL and SECURITY DEFINER
-- We use PLPGSQL to ensure it's treated as a function unit and not inlined
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Check if the user is super_admin without triggering RLS
  -- This function is SECURITY DEFINER, so it runs with owner privileges (postgres)
  -- It should bypass RLS on public.usuarios
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  ) INTO _is_admin;
  
  RETURN _is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine get_my_shop_ids with PLPGSQL and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_shop_ids()
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  -- Queries establishments to find shops owned by the user
  -- SECURITY DEFINER ensures we bypass RLS on establishments
  SELECT array_agg(id) INTO result
  FROM public.establishments 
  WHERE owner_id = auth.uid();
  
  IF result IS NULL THEN
    result := '{}';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-apply policies using the secure functions

-- Establishments: Super Admin Access
CREATE POLICY "Super Admin full access establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());

-- Usuarios: Super Admin Access
-- Note: usage of is_super_admin() here is safe IF is_super_admin() correctly bypasses RLS.
CREATE POLICY "Super Admin full access usuarios" ON public.usuarios
FOR ALL USING (public.is_super_admin());

-- Usuarios: Owner Access (View clients in their shop)
CREATE POLICY "Owner can view shop clients" ON public.usuarios
FOR SELECT USING (
  establishment_id = ANY(public.get_my_shop_ids())
);

-- 5. Ensure Owner Access on Establishments is also clean
DROP POLICY IF EXISTS "allow_owner" ON establishments;
CREATE POLICY "allow_owner" ON establishments 
  FOR ALL 
  USING (owner_id = auth.uid()) 
  WITH CHECK (owner_id = auth.uid());
