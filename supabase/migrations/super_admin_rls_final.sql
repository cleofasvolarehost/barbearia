-- Phase: Super Admin RLS & Manual Creation

-- 1. Helper for Super Admin Check (if not exists)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. RLS Policies for Super Admin (ALL ACCESS) - Overwrite or Create
-- We use DO block to avoid errors if policies don't exist, or just drop/create.

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

-- 3. RPC to create Shop + Owner (Ghost) without Auth
-- This allows Super Admin to create a shop record. The owner can "claim" it later via password reset or magic link if we implement that.
-- OR, this is just for record keeping until they register.

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
    -- Generate a UUID for the user since we don't have an Auth ID
    new_user_id := extensions.uuid_generate_v4();
    
    -- Insert into usuarios
    INSERT INTO public.usuarios (id, nome, email, telefone, tipo, created_at)
    VALUES (new_user_id, owner_name, owner_email, owner_phone, 'owner', now());

    -- Insert into establishments
    INSERT INTO public.establishments (owner_id, name, slug, created_at, subscription_status, subscription_plan)
    VALUES (new_user_id, shop_name, shop_slug, now(), 'active', 'pro')
    RETURNING id INTO new_shop_id;

    RETURN new_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
