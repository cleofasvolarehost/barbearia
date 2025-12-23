-- Phase 1: Database & Roles

-- 1. Ensure 'usuarios' has the correct roles (already done in previous steps, but reinforcing)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_tipo_check 
CHECK (tipo IN ('super_admin', 'owner', 'barber', 'client'));

-- 2. Add birth_date to usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- 3. Promote 'retornoja' to super_admin
-- ID obtained from previous context: 28281740-d407-453e-bfd4-fb5feadbf87d
UPDATE public.usuarios 
SET tipo = 'super_admin' 
WHERE id = '28281740-d407-453e-bfd4-fb5feadbf87d';

-- 4. Ensure public access for 'ghost' user creation (if not already)
-- We need to allow unauthenticated users (anon) to insert into 'usuarios' IF they are creating a client profile.
-- The previous 'allow_user_insert' might rely on auth.uid(). 
-- For ghost users (unauthenticated), auth.uid() is null.
-- We need a policy for ANON insert.

DROP POLICY IF EXISTS "Anon can create ghost client" ON public.usuarios;
CREATE POLICY "Anon can create ghost client" ON public.usuarios
FOR INSERT 
WITH CHECK (
    auth.role() = 'anon' 
    AND tipo = 'client'
);

-- 5. Grant anon usage on sequence/tables if needed
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.usuarios TO anon;

-- 6. Also allow anon to insert into agendamentos (for the booking itself)
DROP POLICY IF EXISTS "Anon can create appointment" ON public.agendamentos;
CREATE POLICY "Anon can create appointment" ON public.agendamentos
FOR INSERT 
WITH CHECK (
    auth.role() = 'anon'
);

-- 7. Allow anon to read services (already public)
-- 8. Allow anon to read barbers (already public)
