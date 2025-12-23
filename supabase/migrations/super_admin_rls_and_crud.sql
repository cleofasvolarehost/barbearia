-- Phase: Super Admin RLS & Manual Creation

-- 1. Helper for Super Admin Check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. RLS Policies for Super Admin (ALL ACCESS)

-- Establishments
DROP POLICY IF EXISTS "Super Admin full access establishments" ON public.establishments;
CREATE POLICY "Super Admin full access establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());

-- Usuarios (Profiles)
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


-- 3. Function to create Shop + Owner (Ghost)
-- Since we cannot create auth.users easily from client without admin key,
-- we will insert into public.usuarios and public.establishments directly.
-- The user will be a "Ghost Owner" until they claim the account (or we assume external auth creation).

CREATE OR REPLACE FUNCTION public.create_shop_and_owner(
    shop_name TEXT,
    shop_slug TEXT,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    new_shop_id UUID;
BEGIN
    -- 1. Create Ghost User in public.usuarios
    -- We generate a random UUID for the ID since we don't have the Auth ID yet.
    -- This is a temporary placeholder. Ideally, this function is called AFTER auth.signUp.
    -- BUT, if we want to pre-create, we can do this:
    
    new_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO public.usuarios (id, nome, email, telefone, tipo, created_at)
    VALUES (new_user_id, owner_name, owner_email, owner_phone, 'owner', now());

    -- 2. Create Establishment linked to this Ghost User
    INSERT INTO public.establishments (owner_id, name, slug, created_at, subscription_status, subscription_plan)
    VALUES (new_user_id, shop_name, shop_slug, now(), 'active', 'pro')
    RETURNING id INTO new_shop_id;

    RETURN new_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
