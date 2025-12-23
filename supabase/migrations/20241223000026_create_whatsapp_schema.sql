-- 1. Create table for WhatsApp Templates & Settings
create table if not exists public.whatsapp_config (
    id uuid default gen_random_uuid() primary key,
    establishment_id uuid references public.establishments(id) not null,
    
    -- Credentials (optional override, otherwise use env/saas_settings)
    instance_id text,
    api_token text,
    
    -- Status
    is_active boolean default false,
    
    -- Templates (JSONB for flexibility)
    templates jsonb default '{
        "confirmation": "Fala, {nome_cliente}! Agendamento confirmado. 👊 🗓 Data: {data} 🕒 Horário: {hora} 💈 Barbeiro: {barbeiro} ✂️ Serviço: {servico}. Tmj!",
        "reminder_1h": "Opa, {nome_cliente}! Passando pra lembrar que daqui a 1 hora (às {hora}) é a tua vez na cadeira. Chega 5 min antes!",
        "birthday": "E aí, {nome_cliente}! Meus parabéns! 🎉 Hoje o dia é teu. Ganhe 10% OFF no próximo corte!"
    }'::jsonb,
    
    -- Triggers (Active/Inactive)
    triggers jsonb default '{
        "confirmation": true,
        "reminder_1h": true,
        "birthday": false
    }'::jsonb,

    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    
    unique(establishment_id)
);

-- RLS
alter table public.whatsapp_config enable row level security;
create policy "Owners manage whatsapp config" on public.whatsapp_config
    for all using (
        auth.uid() in (select owner_id from establishments where id = establishment_id)
    );


-- 2. Create table for WhatsApp Logs (History)
create table if not exists public.whatsapp_logs (
    id uuid default gen_random_uuid() primary key,
    establishment_id uuid references public.establishments(id),
    client_id uuid references public.usuarios(id), -- Optional
    booking_id uuid references public.agendamentos(id), -- Optional
    
    phone_number text not null,
    message_type text, -- 'confirmation', 'reminder', 'test', etc.
    message_body text,
    
    status text check (status in ('sent', 'failed', 'pending')),
    api_response jsonb, -- Store raw API response for debugging
    
    created_at timestamp with time zone default now()
);

-- RLS
alter table public.whatsapp_logs enable row level security;
create policy "Owners view whatsapp logs" on public.whatsapp_logs
    for select using (
        auth.uid() in (select owner_id from establishments where id = establishment_id)
    );

-- 3. Function to log whatsapp attempts (RPC)
CREATE OR REPLACE FUNCTION log_whatsapp_attempt(
    p_establishment_id UUID,
    p_phone TEXT,
    p_type TEXT,
    p_body TEXT,
    p_status TEXT,
    p_response JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.whatsapp_logs (
        establishment_id, phone_number, message_type, message_body, status, api_response
    ) VALUES (
        p_establishment_id, p_phone, p_type, p_body, p_status, p_response
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
