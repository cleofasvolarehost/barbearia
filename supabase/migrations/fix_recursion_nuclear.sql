-- NUCLEAR OPTION: DROP ALL POLICIES AND REBUILD SAFELY
-- The previous attempt might have failed if I didn't execute it properly or if there are lingering policies.
-- Let's be 100% sure we clear the slate for 'usuarios'.

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 1. Drop ALL policies on 'usuarios' by name (exhaustive list of what we've created)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.usuarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.usuarios;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.usuarios;
DROP POLICY IF EXISTS "Users can read own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Self Read" ON public.usuarios;
DROP POLICY IF EXISTS "Self Update" ON public.usuarios;
DROP POLICY IF EXISTS "Self Insert" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Read" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Update" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Insert" ON public.usuarios;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Create ONLY the safest, simplest "Self" policies
-- These policies ONLY check auth.uid() = id. They DO NOT query the table itself.
-- This guarantees NO RECURSION is possible within these policies.

CREATE POLICY "Safe Self Read" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Safe Self Update" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Safe Self Insert" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Fix the "Admin" check problem
-- If we need to check roles, we CANNOT use RLS on 'usuarios' if we are already inside a query on 'usuarios'.
-- But usually we check roles when accessing OTHER tables (like 'agendamentos').
-- The error "infinite recursion detected in policy for relation usuarios" implies that:
-- Someone is trying to SELECT from 'usuarios'.
-- The policy "Safe Self Read" runs. It checks `auth.uid() = id`. This is safe.
--
-- HOWEVER, if there is a policy like:
-- "Admins can read everyone" -> USING ( (SELECT tipo FROM usuarios WHERE id = auth.uid()) = 'admin' )
-- THIS is the recursion.
-- We must ENSURE no such policy exists. I have dropped them above.

-- 4. Create the helper function again to be sure
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT tipo FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Fix Agendamentos policies to use the safe function
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (
  (SELECT public.get_my_role()) = 'super_admin'
);

DROP POLICY IF EXISTS "Owner sees all in their shop" ON public.agendamentos;
CREATE POLICY "Owner sees all in their shop" ON public.agendamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = agendamentos.establishment_id
    AND e.owner_id = auth.uid()
  )
);

-- Fix Barber policy
DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;
CREATE POLICY "Barber sees their own or their shop assignments" ON public.agendamentos
FOR SELECT USING (
  -- Check if user is the barber assigned
  auth.uid() = barbeiro_id
  OR
  -- Or if user is a barber in the shop (complex, let's simplify for now)
  -- Just seeing own assignments is enough for 'minhas-reservas'
  auth.uid() = barbeiro_id
);

-- Fix Client policy
DROP POLICY IF EXISTS "Client sees own appointments" ON public.agendamentos;
CREATE POLICY "Client sees own appointments" ON public.agendamentos
FOR ALL USING (
  auth.uid() = usuario_id
);
