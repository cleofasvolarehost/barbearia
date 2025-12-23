-- Enable RLS on usuarios if not already
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.usuarios;
CREATE POLICY "Users can read own profile" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;
CREATE POLICY "Users can update own profile" ON public.usuarios
FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (duplicate check but safe)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.usuarios;
CREATE POLICY "Users can insert own profile" ON public.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);
