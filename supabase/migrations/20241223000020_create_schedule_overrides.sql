create table if not exists public.schedule_overrides (
  id uuid default gen_random_uuid() primary key,
  barber_id uuid references public.profiles(id) not null,
  establishment_id uuid references public.establishments(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  type text check (type in ('full_day', 'custom_slot')) not null,
  reason text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.schedule_overrides enable row level security;

-- Policy: Public Read (so clients can see blocked slots)
create policy "Public read overrides"
  on public.schedule_overrides for select
  using (true);

-- Policy: Owner/Barber Write
create policy "Staff manage overrides"
  on public.schedule_overrides for all
  using (
    auth.uid() = barber_id 
    or 
    auth.uid() in (
      select owner_id from establishments where id = establishment_id
    )
  );
