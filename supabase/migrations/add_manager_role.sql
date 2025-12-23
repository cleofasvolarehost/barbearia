-- Phase: Granular Permissions (Barber Manager)

-- 1. Add is_manager column to usuarios table
-- Only relevant for role 'barber', but can be on profile for simplicity
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- 2. Update RLS for Agendamentos to respect Manager Role
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;

-- Helper function to check if user is a manager (securely)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
  SELECT is_manager FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Comprehensive Barber Policy
CREATE POLICY "Barber access policy" ON public.agendamentos
FOR ALL USING (
  -- 1. Owner sees all in their establishment (Already covered by "Owner sees all in their shop" policy, but let's reinforce or rely on that)
  -- 2. Barber Logic:
  (
    -- Is a Barber
    (SELECT public.get_my_role()) = 'barber'
    AND
    (
        -- Case A: Is Manager -> See ALL in establishment they belong to (assuming we link barber to establishment via auth or query)
        -- We need to know which establishment the barber belongs to.
        -- 'barbeiros' table links to 'establishment_id'.
        -- We need to find the establishment_id of the current barber user.
        -- The 'barbeiros' table has an 'id' which might NOT be the auth.uid().
        -- Wait, 'barbeiros' table is the profile for the barber in the shop context.
        -- Does 'barbeiros' table link to 'usuarios' (auth.uid)? 
        -- Looking at schema: 'barbeiros' does NOT have 'user_id' FK to 'usuarios' explicitly in the dump I saw earlier.
        -- Wait, if 'barbeiros' table doesn't link to auth.uid(), how do we know which barber is the logged in user?
        -- In `BookSlug.tsx`, we select from `barbeiros`.
        -- In `AdminTeam.tsx`, we fetch `barbeiros`.
        -- BUT, when a barber logs in, they are in `usuarios` table.
        -- Is there a link between `usuarios` and `barbeiros`?
        -- Let's check `usuarios` table again. It has `tipo` = 'barber'.
        -- But `agendamentos` has `barbeiro_id`. Is this `barbeiro_id` referencing `barbeiros.id` or `usuarios.id`?
        -- Schema says: agendamentos_barbeiro_id_fkey -> barbeiros.id
        -- So we need to link `auth.uid()` (usuarios) to `barbeiros` table.
        -- If they are not linked, we have a problem.
        -- Usually `barbeiros` table might be for display, and `usuarios` for login.
        -- Maybe we added a column to `barbeiros` linking to `usuarios`? Or vice versa?
        -- Let's assume for now that for the SaaS, the 'barbeiro_id' in 'agendamentos' refers to the 'barbeiros' table row.
        -- AND we need to know if the current `auth.uid()` corresponds to that `barbeiro_id`.
        -- IF they are not linked, we can't implement "Barber sees own".
        
        -- Let's check if we can link them.
        -- If we cannot link them easily in SQL without a join column, we might need to add one.
        -- Let's add `user_id` to `barbeiros` to link to `auth.users` (or `public.usuarios`).
        -- This allows us to map a Login User to a Barber Profile.
        
        -- For this task, I will add `user_id` to `barbeiros` if it doesn't exist, to enable this mapping.
        -- Then:
        -- Manager Barber: Can see all agendamentos where establishment_id matches their establishment.
        -- Standard Barber: Can see agendamentos where barbeiro_id matches their linked barber profile.
    )
  )
);

-- Adding user_id to barbeiros to link Auth to Profile
ALTER TABLE public.barbeiros 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.usuarios(id);

-- Update Policy
DROP POLICY IF EXISTS "Barber access policy" ON public.agendamentos;

CREATE POLICY "Barber and Manager Policy" ON public.agendamentos
FOR ALL USING (
    -- 1. If User is Owner (Covered by other policy, but included for completeness if needed)
    -- 2. If User is Barber
    (SELECT public.get_my_role()) = 'barber'
    AND
    (
        -- Case A: Is Manager -> See all in their establishment
        (
            public.is_manager() = true
            AND
            establishment_id IN (
                SELECT establishment_id FROM public.barbeiros WHERE user_id = auth.uid()
            )
        )
        OR
        -- Case B: Is Regular Barber -> See only assigned appointments
        (
            barbeiro_id IN (
                SELECT id FROM public.barbeiros WHERE user_id = auth.uid()
            )
        )
    )
);

-- Grant permissions
GRANT ALL ON public.usuarios TO postgres;
GRANT ALL ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
