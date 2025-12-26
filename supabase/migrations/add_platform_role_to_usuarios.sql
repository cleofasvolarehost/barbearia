-- Add platform_role column to usuarios and index for quick role checks
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS platform_role text;

-- Optional: ensure tipo supports 'super_admin' if using enum; if it's text, skip
-- If tipo is enum and doesn't include 'super_admin', you need to alter enum separately.

CREATE INDEX IF NOT EXISTS usuarios_platform_role_idx ON public.usuarios(platform_role);

