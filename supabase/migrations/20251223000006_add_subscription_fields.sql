-- Add ends_at column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;

-- Ensure unique constraint for upsert
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_plan_unique UNIQUE (user_id, plan_id);

-- Create Payment History Table
CREATE TABLE IF NOT EXISTS public.saas_payment_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  amount numeric(10, 2) not null,
  status text,
  provider text,
  provider_transaction_id text,
  created_at timestamp with time zone default now()
);

-- Also ensure establishments has these fields
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone;
