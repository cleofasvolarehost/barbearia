-- Barber Club Membership System

-- 1. Shop Plans Table
CREATE TABLE IF NOT EXISTS public.shop_plans (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    establishment_id UUID REFERENCES public.establishments(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    days_valid INTEGER DEFAULT 30,
    max_cuts INTEGER, -- NULL means unlimited
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Client Subscriptions Table
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    establishment_id UUID REFERENCES public.establishments(id) NOT NULL,
    client_id UUID REFERENCES auth.users(id) NOT NULL,
    plan_id UUID REFERENCES public.shop_plans(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. RLS Policies

-- shop_plans
ALTER TABLE public.shop_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to active plans"
    ON public.shop_plans FOR SELECT
    USING (active = true);

CREATE POLICY "Owners can manage their plans"
    ON public.shop_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.establishments e
            WHERE e.id = shop_plans.establishment_id
            AND e.owner_id = auth.uid()
        )
    );

-- client_subscriptions
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own subscriptions"
    ON public.client_subscriptions FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Owners can view subscriptions for their shop"
    ON public.client_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.establishments e
            WHERE e.id = client_subscriptions.establishment_id
            AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "System/Owners can manage subscriptions"
    ON public.client_subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.establishments e
            WHERE e.id = client_subscriptions.establishment_id
            AND e.owner_id = auth.uid()
        )
        OR 
        (SELECT public.get_my_role()) = 'service_role' -- Allow backend/edge functions
    );

-- Indexing
CREATE INDEX IF NOT EXISTS idx_shop_plans_est ON public.shop_plans(establishment_id);
CREATE INDEX IF NOT EXISTS idx_client_subs_client ON public.client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subs_est ON public.client_subscriptions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_client_subs_status ON public.client_subscriptions(status);
