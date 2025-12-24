-- Fix Infinite Recursion in Agendamentos RLS Policies
-- 
-- The issue is a circular dependency in RLS policies:
-- agendamentos → establishments → usuarios → establishments (via get_my_shop_ids)
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS to break the cycle

-- 1. Ensure is_super_admin is SECURITY DEFINER and stable
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- SECURITY DEFINER runs with owner privileges, bypassing RLS
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND tipo = 'super_admin'
  ) INTO _is_admin;
  
  RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- 2. Create a secure function to check if user owns an establishment
CREATE OR REPLACE FUNCTION public.owns_establishment(establishment_id UUID)
RETURNS boolean AS $$
DECLARE
  _is_owner boolean;
BEGIN
  -- SECURITY DEFINER bypasses RLS on establishments
  SELECT EXISTS (
    SELECT 1 FROM public.establishments 
    WHERE id = establishment_id AND owner_id = auth.uid()
  ) INTO _is_owner;
  
  RETURN COALESCE(_is_owner, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.owns_establishment(UUID) TO authenticated;

-- 3. Recreate get_my_shop_ids with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_shop_ids()
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  -- SECURITY DEFINER bypasses RLS on establishments
  SELECT array_agg(id) INTO result
  FROM public.establishments 
  WHERE owner_id = auth.uid();
  
  IF result IS NULL THEN
    result := '{}';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_shop_ids() TO authenticated;

-- 4. Fix Agendamentos Policies - Remove recursion risk
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can create appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Super Admin full access agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Super Admin sees all" ON public.agendamentos;
DROP POLICY IF EXISTS "Owner sees all in their shop" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;
DROP POLICY IF EXISTS "Client sees own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Anon can create appointment" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber access policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber and Manager Policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Public can insert appointments" ON public.agendamentos;

-- Create clean, non-recursive policies

-- Super Admin has full access
CREATE POLICY "Super Admin full access" ON public.agendamentos
FOR ALL USING (public.is_super_admin());

-- Clients can view their own appointments
CREATE POLICY "Clients view own appointments" ON public.agendamentos
FOR SELECT USING (auth.uid() = usuario_id);

-- Clients can create appointments for themselves
CREATE POLICY "Clients create own appointments" ON public.agendamentos
FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Clients can update their own appointments (for rescheduling)
CREATE POLICY "Clients update own appointments" ON public.agendamentos
FOR UPDATE USING (auth.uid() = usuario_id);

-- Owners can view and manage appointments in their establishments
CREATE POLICY "Owners manage shop appointments" ON public.agendamentos
FOR ALL USING (
  public.owns_establishment(agendamentos.establishment_id)
);

-- Barbers can see their own assignments
CREATE POLICY "Barbers see own assignments" ON public.agendamentos
FOR SELECT USING (auth.uid() = barbeiro_id);

-- Allow anonymous appointment creation (for booking flow)
CREATE POLICY "Allow anonymous booking" ON public.agendamentos
FOR INSERT WITH CHECK (true);

-- 5. Fix Usuarios Policies - Ensure no recursion
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update own data" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin sees all" ON public.usuarios;
DROP POLICY IF EXISTS "Super Admin full access usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Owner can view shop clients" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Users can update their own data" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Read" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Update" ON public.usuarios;
DROP POLICY IF EXISTS "Safe Self Insert" ON public.usuarios;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Public read access" ON public.usuarios;

-- Create simple, non-recursive policies
CREATE POLICY "Users read own profile" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

-- Super Admin can access all user profiles
CREATE POLICY "Super Admin manages users" ON public.usuarios
FOR ALL USING (public.is_super_admin());

-- Owners can see users in their establishments (without recursion)
CREATE POLICY "Owners see establishment users" ON public.usuarios
FOR SELECT USING (
  establishment_id = ANY(public.get_my_shop_ids())
);

-- 6. Fix Establishments Policies
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read establishments" ON public.establishments;
DROP POLICY IF EXISTS "Owner manages own establishment" ON public.establishments;
DROP POLICY IF EXISTS "Super Admin manages establishments" ON public.establishments;
DROP POLICY IF EXISTS "Super Admin full access establishments" ON public.establishments;
DROP POLICY IF EXISTS "allow_owner" ON public.establishments;

-- Public can read all establishments (for booking page)
CREATE POLICY "Public read establishments" ON public.establishments
FOR SELECT USING (true);

-- Owners manage their own establishments
CREATE POLICY "Owners manage own establishment" ON public.establishments
FOR ALL USING (owner_id = auth.uid());

-- Super Admin manages all establishments
CREATE POLICY "Super Admin manages establishments" ON public.establishments
FOR ALL USING (public.is_super_admin());

-- 7. Fix Agendamentos_Servicos Policies to avoid recursion
ALTER TABLE public.agendamentos_servicos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for involved parties" ON public.agendamentos_servicos;
DROP POLICY IF EXISTS "Enable insert for clients" ON public.agendamentos_servicos;

-- Create a helper function to check if user can access an appointment
CREATE OR REPLACE FUNCTION public.can_access_appointment(appointment_id UUID)
RETURNS boolean AS $$
DECLARE
  _can_access boolean;
BEGIN
  -- SECURITY DEFINER bypasses RLS on agendamentos
  SELECT EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.id = appointment_id
    AND (
      a.usuario_id = auth.uid() -- Client
      OR a.barbeiro_id = auth.uid() -- Barber
      OR public.owns_establishment(a.establishment_id) -- Owner
      OR public.is_super_admin() -- Super Admin
    )
  ) INTO _can_access;
  
  RETURN COALESCE(_can_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.can_access_appointment(UUID) TO authenticated;

-- Simple policy using the secure function
CREATE POLICY "Users can access appointment services" ON public.agendamentos_servicos
FOR ALL USING (
  public.can_access_appointment(agendamento_id)
);
