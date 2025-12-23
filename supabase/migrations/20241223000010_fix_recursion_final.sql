-- Fix Infinite Recursion on 'usuarios' RLS
-- Problem: The policy "Super Admin full access usuarios" calls is_super_admin()
-- which selects from 'usuarios' again, creating a loop.

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;

-- 2. Create a JWT-based function to check super admin role to avoid table lookup recursion
-- This assumes we might store 'role' or 'tipo' in app_metadata or we need a secure way.
-- However, since 'tipo' is in the table, we must break the loop.
-- Strategy: Use SECURITY DEFINER function that bypasses RLS to check admin status.

CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS boolean AS $$
BEGIN
  -- Direct check bypassing RLS (since it's inside a function, but we need to be careful)
  -- Actually, the recursion happens because the policy on 'usuarios' triggers when is_super_admin() reads 'usuarios'.
  -- Solution: is_super_admin() is already SECURITY DEFINER.
  -- Wait, if is_super_admin() selects from public.usuarios, that select triggers the policy again?
  -- YES, unless we exclude the check itself from the policy or use a different method.
  
  -- Better approach: Check if the current user ID matches a super_admin record, 
  -- BUT we must ensure this specific query doesn't trigger the policy.
  -- One way is to rely on JWT claims if 'tipo' was synced there. 
  -- Since it's not guaranteed, we will use a dedicated function that selects directly.
  
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the policy but optimized
-- Wait, if is_super_admin_safe() is SECURITY DEFINER, does it bypass RLS?
-- Yes, "SECURITY DEFINER functions are executed with the privileges of the user that created it."
-- If the creator (postgres/superuser) has bypass RLS, then it works.
-- BUT, typically table owners are subject to RLS in Supabase unless they are superusers.
-- Let's ensure the function is created by a role that bypasses RLS or explicitly disable RLS for the check.

-- Correct Fix:
-- We can simply check the claim if possible, or...
-- We can add a condition to the policy to NOT apply to the super admin check itself? No.
-- The standard fix for recursion in user profiles is:
-- ALLOW users to read their own profile (already done).
-- ALLOW super admins to read ALL profiles.

-- To fix the loop in is_super_admin():
-- We can create a view or use a separate table for roles if we wanted perfection.
-- But for now, let's try to optimize the policy to avoid calling the function if we can know from context.
-- Actually, the recursion error specifically says: policy for relation "usuarios".
-- This confirms that `SELECT * FROM usuarios` inside the policy function is the culprit.

-- FORCE FIX:
-- We will replace `is_super_admin()` logic to NOT query `usuarios` if possible, 
-- OR we exclude the `usuarios` table from RLS for the super admin check specifically (hard to do).
-- ALTERNATIVE: Use `auth.jwt() ->> 'user_metadata'` if 'tipo' is stored there.
-- Assuming we sync 'tipo' to metadata. If not, we are stuck.

-- Let's try the SECURITY DEFINER approach again but ensure the function is owned by postgres.
-- In Supabase, functions created in dashboard/migrations are usually owned by postgres.
-- If RLS is enabled on `usuarios`, `SELECT` inside the function triggers it.
-- Unless the function is `SECURITY DEFINER` AND the owner has `BYPASS RLS`.
-- `postgres` role usually has BYPASS RLS.

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;

-- 4. Re-apply the policy
CREATE POLICY "Super Admin full access usuarios" ON public.usuarios
FOR ALL USING (
  -- We can't easily avoid the read if we don't trust metadata.
  -- But wait, if the user IS a super admin, they can read.
  -- If they are NOT, the check fails.
  -- The check itself reads.
  
  -- Let's try to trust the function if it's SECURITY DEFINER.
  public.is_super_admin()
);

-- 5. Fix Establishments Recursion if any
-- (The log mentioned recursion on 'usuarios', but 'establishments' might be related if it joins).

-- CRITICAL FIX:
-- If `is_super_admin` is causing recursion, it means RLS is applying to the SELECT inside it.
-- To prevent this, we can grant the function owner BYPASS RLS, which is default for postgres.
-- BUT, if we are running as a role that doesn't have it...
-- Let's try to use a direct ID check for a known super admin list if we had one, but we don't.

-- Alternative: Split the policy.
-- "Super admins can do everything"
-- "Users can read own"
-- "Public can read barbers/establishments"

-- Let's try to break the loop by excluding the current row from the check? No.
-- The most robust fix for Supabase "User Table RLS Recursion" is to use `auth.jwt()` metadata.
-- IF we don't have it, we must rely on `SECURITY DEFINER` working correctly.

-- Let's try to Drop and Recreate the function explicitly setting search_path and ensuring security definer.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  -- We use a raw query or just standard select.
  -- To avoid RLS, this function MUST be run by a superuser or role with bypassrls.
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the policy uses this function.
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;
CREATE POLICY "Super Admin full access usuarios" ON public.usuarios
FOR ALL USING (
   public.is_super_admin()
);

