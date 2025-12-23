-- Fix missing INSERT policy for usuarios table
-- This allows authenticated users to create their own profile record during registration
CREATE POLICY "Users can insert their own profile" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure users can insert their own appointments (already present but verifying)
DROP POLICY IF EXISTS "Users can create appointments" ON public.agendamentos;
CREATE POLICY "Users can create appointments" 
ON public.agendamentos
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);
