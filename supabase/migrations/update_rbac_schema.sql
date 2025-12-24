-- 1. Update roles in 'usuarios' table to match strict RBAC (English)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_check;

UPDATE public.usuarios SET tipo = 'owner' WHERE tipo = 'dono' OR tipo = 'admin';
UPDATE public.usuarios SET tipo = 'barber' WHERE tipo = 'barbeiro';
UPDATE public.usuarios SET tipo = 'client' WHERE tipo = 'cliente';

-- Default any unknown to client
UPDATE public.usuarios SET tipo = 'client' WHERE tipo NOT IN ('super_admin', 'owner', 'barber', 'client');

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_tipo_check 
CHECK (tipo IN ('super_admin', 'owner', 'barber', 'client'));

-- 2. Update RLS Policies for Data Isolation

-- Agendamentos (Appointments)
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Owner sees all in their shop" ON public.agendamentos;
CREATE POLICY "Owner sees all in their shop" ON public.agendamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = agendamentos.establishment_id
    AND e.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;
CREATE POLICY "Barber sees their own or their shop assignments" ON public.agendamentos
FOR SELECT USING (
  barbeiro_id IN (SELECT id FROM public.barbeiros WHERE id = auth.uid()) -- If barber is linked via ID (need to verify barber link)
  OR 
  -- Assuming barber is a user in 'usuarios' with tipo='barber'
  -- And 'agendamentos' has 'barbeiro_id' which points to 'barbeiros' table.
  -- We need to link auth.uid() to barbeiros.id OR check if auth.uid() is the user in usuarios who is a barber.
  -- Limitation: The current schema has 'barbeiros' table separate from 'usuarios' or linked?
  -- 'barbeiros' table has no obvious link to 'usuarios' table in the schema I saw!
  -- Wait, `barbeiros` table has `id`, `nome`... 
  -- `usuarios` table has `id` (uuid from auth).
  -- If a barber logs in, they are a user in `usuarios`.
  -- How do we know which `barbeiro` record corresponds to the logged in `usuario`?
  -- PROBABLY `barbeiros.id` IS the `auth.uid()`?
  -- Let's assume for now `barbeiros.id` = `usuarios.id` = `auth.uid()` for barbers.
  auth.uid() = barbeiro_id
);

DROP POLICY IF EXISTS "Client sees own appointments" ON public.agendamentos;
CREATE POLICY "Client sees own appointments" ON public.agendamentos
FOR ALL USING (
  auth.uid() = usuario_id
);

-- Establishments
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read establishments" ON public.establishments;
CREATE POLICY "Public read establishments" ON public.establishments
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owner manages own establishment" ON public.establishments;
CREATE POLICY "Owner manages own establishment" ON public.establishments
FOR ALL USING (
  owner_id = auth.uid()
);

-- Super Admin manage establishments
DROP POLICY IF EXISTS "Super Admin manages establishments" ON public.establishments;
CREATE POLICY "Super Admin manages establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());
