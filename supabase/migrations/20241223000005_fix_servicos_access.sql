-- Fix RLS for servicos table to ensure public access
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.servicos;
DROP POLICY IF EXISTS "Public can view services" ON public.servicos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.servicos;
DROP POLICY IF EXISTS "Allow public read access" ON public.servicos;

-- Create the definitive public read policy
CREATE POLICY "Public services read access"
ON public.servicos FOR SELECT
TO anon, authenticated
USING (true);

-- Ensure permissions are granted to the roles
GRANT SELECT ON public.servicos TO anon;
GRANT SELECT ON public.servicos TO authenticated;

-- Also fix Barbeiros just in case
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Barbers are viewable by everyone" ON public.barbeiros;
CREATE POLICY "Barbers are viewable by everyone"
ON public.barbeiros FOR SELECT
TO anon, authenticated
USING (true);
GRANT SELECT ON public.barbeiros TO anon;
GRANT SELECT ON public.barbeiros TO authenticated;
