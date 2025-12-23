-- Phase: Super Admin Expansion

-- 1. Upgrade Establishments Table for SaaS Management
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active', -- active, suspended, canceled
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- 2. Create SaaS Payments Table (Revenue Tracking)
CREATE TABLE IF NOT EXISTS public.saas_payments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    establishment_id UUID REFERENCES public.establishments(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'paid', -- paid, pending, failed
    payment_method TEXT, -- credit_card, pix
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for SaaS Payments
ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;

-- Super Admin sees all payments
CREATE POLICY "Super Admin sees all saas_payments" ON public.saas_payments
FOR ALL USING (
  (SELECT public.get_my_role()) = 'super_admin'
);

-- Owner sees their own payments
CREATE POLICY "Owner sees own saas_payments" ON public.saas_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = saas_payments.establishment_id
    AND e.owner_id = auth.uid()
  )
);

-- 4. Update Establishments RLS to allow Super Admin full access (already covered by role check usually, but ensuring)
-- We need to make sure Super Admin can UPDATE establishments (for suspend/ban)
-- Previous policies might be SELECT only or Owner specific.

DROP POLICY IF EXISTS "Super Admin full access establishments" ON public.establishments;
CREATE POLICY "Super Admin full access establishments" ON public.establishments
FOR ALL USING (
  (SELECT public.get_my_role()) = 'super_admin'
);

-- 5. Grant permissions
GRANT ALL ON public.saas_payments TO postgres;
GRANT ALL ON public.saas_payments TO authenticated;
GRANT ALL ON public.saas_payments TO service_role;
