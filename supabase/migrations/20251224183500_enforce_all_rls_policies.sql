-- Ensure RLS is enabled
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Re-create Helper Function for Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Public Access (Read-Only)
DROP POLICY IF EXISTS "Establishments are viewable by everyone" ON public.establishments;
CREATE POLICY "Establishments are viewable by everyone" 
    ON public.establishments FOR SELECT 
    USING (true);

-- 2. Owner Access (Manage Own Shop)
DROP POLICY IF EXISTS "Owners can insert their own establishment" ON public.establishments;
CREATE POLICY "Owners can insert their own establishment" 
    ON public.establishments FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their own establishment" ON public.establishments;
CREATE POLICY "Owners can update their own establishment" 
    ON public.establishments FOR UPDATE 
    USING (auth.uid() = owner_id);

-- 3. Super Admin Access (God Mode)
DROP POLICY IF EXISTS "Super Admin full access establishments" ON public.establishments;
CREATE POLICY "Super Admin full access establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());

-- 4. Ensure Super Admin access on other tables too (from super_admin_rls_final.sql)
-- Usuarios
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;
CREATE POLICY "Super Admin full access usuarios" ON public.usuarios
FOR ALL USING (public.is_super_admin());

-- Agendamentos
DROP POLICY IF EXISTS "Super Admin full access agendamentos" ON public.agendamentos;
CREATE POLICY "Super Admin full access agendamentos" ON public.agendamentos
FOR ALL USING (public.is_super_admin());

-- Servicos
DROP POLICY IF EXISTS "Super Admin full access servicos" ON public.servicos;
CREATE POLICY "Super Admin full access servicos" ON public.servicos
FOR ALL USING (public.is_super_admin());

-- Barbeiros
DROP POLICY IF EXISTS "Super Admin full access barbeiros" ON public.barbeiros;
CREATE POLICY "Super Admin full access barbeiros" ON public.barbeiros
FOR ALL USING (public.is_super_admin());

-- Saas Payments
DROP POLICY IF EXISTS "Super Admin full access saas_payments" ON public.saas_payments;
CREATE POLICY "Super Admin full access saas_payments" ON public.saas_payments
FOR ALL USING (public.is_super_admin());
