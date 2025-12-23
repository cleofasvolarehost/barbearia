-- 1. Force the user to be Super Admin in 'usuarios' table (Main App Logic)
UPDATE public.usuarios
SET tipo = 'super_admin'
WHERE email ILIKE '%retornoja%';

-- 2. RLS Policy for Super Admin to manage 'usuarios'
DROP POLICY IF EXISTS "Super Admin Manage All Users" ON public.usuarios;
CREATE POLICY "Super Admin Manage All Users" ON public.usuarios
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.usuarios WHERE tipo = 'super_admin'
        )
    );

-- 3. RLS Policy for Super Admin to manage 'profiles' (Legacy/Alternative)
DROP POLICY IF EXISTS "Super Admin Manage All Profiles" ON public.profiles;
CREATE POLICY "Super Admin Manage All Profiles" ON public.profiles
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM public.usuarios WHERE tipo = 'super_admin'
        )
    );
