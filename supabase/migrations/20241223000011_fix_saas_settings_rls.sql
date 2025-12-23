-- Fix RLS for saas_settings to allow super_admin
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (to be safe)
DROP POLICY IF EXISTS "Allow full access for admins" ON public.saas_settings;
DROP POLICY IF EXISTS "Super Admin full access saas_settings" ON public.saas_settings;

-- Create new policy for super_admin
CREATE POLICY "Super Admin full access saas_settings"
ON public.saas_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() 
    AND tipo = 'super_admin'
  )
);
