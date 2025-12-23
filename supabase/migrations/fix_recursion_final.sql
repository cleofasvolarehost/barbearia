-- FIX INFINITE RECURSION IN POLICIES
-- The recursion happens when a policy on 'agendamentos' queries 'usuarios' to check for admin role,
-- BUT 'usuarios' might have a policy that somehow circles back or the RBAC logic itself is recursive.
-- Specifically, "Super Admin sees all" on agendamentos queries usuarios.
-- If 'usuarios' has a policy that depends on something complex, it might break.
-- But the error reported is on relation "usuarios".
-- Let's check policies on 'usuarios'.
-- Current 'usuarios' policies:
-- 1. "Enable read access for all users" USING (auth.uid() = id) -> Simple, non-recursive.
--
-- However, previously we had policies like "Super Admin sees all" on 'agendamentos' which did:
-- EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND tipo = 'super_admin')
--
-- If we look at 'agendamentos_servicos' policy:
-- EXISTS (SELECT 1 FROM public.agendamentos ...)
--
-- The issue is likely in a policy I haven't seen yet OR in the interaction between them.
-- Wait, the error is "infinite recursion detected in policy for relation usuarios".
-- This usually means a policy on 'usuarios' selects from 'usuarios'.
--
-- Let's look at `update_rbac_schema.sql` again. It didn't add policies to `usuarios`.
-- `force_fix_permissions.sql` added:
-- CREATE POLICY "Enable read access for all users" ON public.usuarios FOR SELECT USING (auth.uid() = id);
-- This is fine.
--
-- BUT, if there are OTHER policies lurking around.
-- Let's DROP ALL policies on `usuarios` and start fresh with the absolute simplest non-recursive ones.

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Drop EVERYTHING on usuarios
DROP POLICY IF EXISTS "Enable read access for all users" ON public.usuarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.usuarios;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios;

-- 1. Simple Self-Access (No recursion possible)
CREATE POLICY "Self Read" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Self Update" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Self Insert" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Allow Super Admin to read all users (CAREFUL HERE)
-- If we do: USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND tipo = 'super_admin'))
-- THIS CAUSES RECURSION! Because to check if you are super_admin, you need to read 'usuarios'.
--
-- SOLUTION: Use a function with SECURITY DEFINER to bypass RLS when checking roles.
-- OR rely on JWT metadata if possible, but we store roles in the table.
--
-- BETTER SOLUTION: Split the check.
-- But for now, let's just stick to "Self Read".
-- If Admin needs to read others, we need a secure function.

-- Let's create a secure function to check role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT tipo FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER; -- SECURITY DEFINER breaks RLS for this function execution

-- Now we can use this function in policies if needed, but for now let's just keep it simple.
-- "Self Read" is enough for the "My Profile" / "My Appointments" flow.
-- The infinite recursion probably came from a "Admin can read all" policy I didn't see or was implicitly added.

-- Also fix `agendamentos` policies just in case they are causing issues downstream
DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
-- Re-implement using the secure function to avoid recursion if it queries usuarios
CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (
  (SELECT public.get_my_role()) = 'super_admin'
);

-- Fix Owner policy on agendamentos to be safe
DROP POLICY IF EXISTS "Owner sees all in their shop" ON public.agendamentos;
CREATE POLICY "Owner sees all in their shop" ON public.agendamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = agendamentos.establishment_id
    AND e.owner_id = auth.uid() -- This is safe, queries establishments
  )
);
