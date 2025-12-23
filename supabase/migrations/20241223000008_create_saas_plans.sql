create table public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  interval_days int not null,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  is_recommended boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.saas_plans enable row level security;

-- Allow anyone (public/authenticated) to read active plans
create policy "Public read access"
  on public.saas_plans for select
  using (true);

-- Allow Super Admin to do everything
create policy "Super Admin full access"
  on public.saas_plans for all
  using (
    exists (
      select 1 from public.usuarios
      where id = auth.uid() and tipo = 'super_admin'
    )
  );
