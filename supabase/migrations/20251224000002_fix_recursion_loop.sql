-- Fix Infinite Recursion in RLS Policies

-- 1. Create a helper function to get the current user's shop IDs securely
-- This function uses SECURITY DEFINER to bypass RLS on the establishments table,
-- preventing the loop: usuarios -> establishments -> usuarios.
CREATE OR REPLACE FUNCTION public.get_my_shop_ids()
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  SELECT array_agg(id) INTO result
  FROM public.establishments 
  WHERE owner_id = auth.uid();
  
  -- Handle null case (no shops)
  IF result IS NULL THEN
    result := '{}';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_shop_ids() TO authenticated;

-- 2. Update the Usuarios Policy to use the secure function
-- First drop the problematic policy
DROP POLICY IF EXISTS "Owner can view shop clients" ON public.usuarios;

-- Re-create it using the function
CREATE POLICY "Owner can view shop clients" ON public.usuarios
FOR SELECT USING (
  establishment_id = ANY(public.get_my_shop_ids())
);

-- 3. Ensure is_super_admin is definitely SECURITY DEFINER (just in case)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Clean up any other potential recursion sources
-- (None found, but this structure prevents the main loop)
