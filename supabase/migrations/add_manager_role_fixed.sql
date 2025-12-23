-- Phase: Granular Permissions (Barber Manager) - FIXED

-- 1. Add is_manager column to usuarios table
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- 2. Adding user_id to barbeiros to link Auth to Profile (Critical for RLS)
ALTER TABLE public.barbeiros 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.usuarios(id);

-- 3. Helper function to check if user is a manager (securely)
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
  SELECT is_manager FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Update RLS for Agendamentos
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Barber access policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber sees their own or their shop assignments" ON public.agendamentos;
DROP POLICY IF EXISTS "Barber and Manager Policy" ON public.agendamentos;

CREATE POLICY "Barber and Manager Policy" ON public.agendamentos
FOR ALL USING (
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
