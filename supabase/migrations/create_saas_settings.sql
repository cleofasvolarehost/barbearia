-- Create saas_settings table
CREATE TABLE IF NOT EXISTS public.saas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

-- Create Policy for Super Admin (assuming 'admin' type in usuarios table)
CREATE POLICY "Allow full access for admins"
ON public.saas_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() 
    AND tipo = 'admin'
  )
);

-- For MVP development, if no admin exists, we might block ourselves. 
-- Adding a temporary fallback policy for dev if needed, but I'll stick to the requirements.
-- If you are testing and not an admin, you might need to update your user type manually in Supabase.
