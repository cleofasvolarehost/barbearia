-- Migration to create 'plans' and 'subscriptions' tables for SaaS management

-- 1. Create 'plans' table
create table if not exists public.plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price_cents integer not null, -- Stored in cents (e.g., 4990 for R$ 49.90)
  interval text default 'month', -- 'month', 'year', etc.
  mp_preapproval_plan_id text, -- Mercado Pago Preapproval Plan ID (optional)
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- RLS for plans (Public Read, Admin Write)
alter table public.plans enable row level security;
create policy "Public read plans" on public.plans for select using (true);

-- 2. Create 'subscriptions' table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  plan_id uuid references public.plans(id) not null,
  status text not null check (status in ('pending', 'active', 'canceled', 'failed')),
  mp_subscription_id text, -- MP Preapproval ID
  mp_payment_id text, -- MP Payment ID (for one-off payments if subscription fails)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS for subscriptions (User sees own)
alter table public.subscriptions enable row level security;
create policy "Users see own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

-- 3. Seed Initial Plans (Example)
insert into public.plans (name, price_cents, interval, active)
values 
  ('Básico', 2990, 'month', true),
  ('Pro', 4990, 'month', true),
  ('Premium', 8990, 'month', true)
on conflict do nothing;
