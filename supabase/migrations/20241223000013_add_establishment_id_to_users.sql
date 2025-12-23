ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_usuarios_establishment_id ON public.usuarios(establishment_id);

-- Update RLS policies (optional but good practice if we want users to see their shop's users)
-- For now, Super Admin bypasses RLS, so this is mainly for structural integrity.
