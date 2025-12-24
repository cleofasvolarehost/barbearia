-- Fix Security Advisor Issues

-- 1. Fix RLS on public.settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings (shop info)
-- This table seems unused or deprecated, but we secure it anyway.
CREATE POLICY "Public settings are viewable by everyone" 
ON public.settings FOR SELECT 
USING (true);

-- Allow admins to update settings
CREATE POLICY "Admins can update settings" 
ON public.settings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() 
    AND tipo = 'admin'
  )
);

-- 2. Fix Security Definer View on public.churn_analysis_view
-- Set security_invoker to true so it uses the permissions of the user querying the view.
ALTER VIEW public.churn_analysis_view SET (security_invoker = true);

-- 3. Add Policy to allow Owners to see their shop's clients
-- This is required because switching churn_analysis_view to security_invoker
-- means the Owner (invoker) must have direct access to the underlying tables (usuarios).
-- Currently, Owners only have access to their own profile ("Self Read").

-- Policy: Owners can view users who belong to their establishment
CREATE POLICY "Owner can view shop clients" ON public.usuarios
FOR SELECT USING (
  -- User is linked to the shop owned by the current user
  establishment_id IN (
    SELECT id FROM public.establishments 
    WHERE owner_id = auth.uid()
  )
);

-- Optional: Also allow Owners to view users who have appointments in their shop
-- This covers cases where a user might not be "linked" via establishment_id but has visited.
-- (Use with caution as it involves a join, but useful for churn view consistency)
CREATE POLICY "Owner can view clients with appointments" ON public.usuarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.usuario_id = usuarios.id
    AND EXISTS (
      SELECT 1 FROM public.establishments e
      WHERE e.id = a.establishment_id
      AND e.owner_id = auth.uid()
    )
  )
);
