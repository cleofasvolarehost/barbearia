-- FORCE override all RLS for usuarios to ensure accessibility
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.usuarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.usuarios;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.usuarios;

-- Simplified robust policies
CREATE POLICY "Enable read access for all users" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on email" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

-- CRITICAL: Grant permissions
GRANT ALL ON public.usuarios TO postgres;
GRANT ALL ON public.usuarios TO anon;
GRANT ALL ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
