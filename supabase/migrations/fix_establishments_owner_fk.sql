-- Fix join relationship between establishments and usuarios
-- Currently establishments.owner_id references auth.users, which makes it hard to join with public.usuarios via PostgREST
-- We will change the foreign key to reference public.usuarios instead.

ALTER TABLE public.establishments
DROP CONSTRAINT IF EXISTS establishments_owner_id_fkey;

ALTER TABLE public.establishments
ADD CONSTRAINT establishments_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES public.usuarios (id)
ON DELETE CASCADE;
