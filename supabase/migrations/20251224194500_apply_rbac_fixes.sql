-- Apply fixes from update_rbac_schema.sql to live DB
-- Specifically targeting Agendamentos and ensuring Establishments use the secure function

-- 1. Agendamentos
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
CREATE POLICY "Super Admin sees all" ON public.agendamentos
FOR ALL USING (public.is_super_admin());

-- 2. Establishments (Reinforcing the fix)
DROP POLICY IF EXISTS "Super Admin manages establishments" ON public.establishments;
CREATE POLICY "Super Admin manages establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());
