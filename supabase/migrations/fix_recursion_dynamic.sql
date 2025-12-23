-- DYNAMICALLY DROP ALL POLICIES ON 'usuarios' TO ENSURE CLEAN SLATE
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'usuarios' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios', pol.policyname); 
    END LOOP; 
END $$;

-- Disable and Re-enable RLS to reset state
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Create SIMPLEST POSSIBLE Policy (No recursion)
CREATE POLICY "Final Self Read" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Final Self Update" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Final Self Insert" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant access
GRANT ALL ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO anon;
GRANT ALL ON public.usuarios TO service_role;

-- Re-define helper function securely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT tipo FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Fix Agendamentos to use helper (already done, but reinforcing)
-- We don't need to touch agendamentos if the previous migration worked, 
-- but the error was on 'usuarios', so the fix above is the key.
