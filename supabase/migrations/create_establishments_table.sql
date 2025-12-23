-- Create establishments table
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    phone TEXT,
    
    -- Working Hours
    open_hour TEXT DEFAULT '09:00',
    close_hour TEXT DEFAULT '19:00',
    work_days INTEGER[] DEFAULT '{1,2,3,4,5,6}', -- 0=Sun, 1=Mon, ...
    
    -- Visual Identity
    primary_color TEXT DEFAULT '#7C3AED',
    secondary_color TEXT DEFAULT '#2DD4BF',
    banner_url TEXT,
    
    -- Integrations (Wordnet)
    wordnet_instance_id TEXT,
    wordnet_token TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for establishments
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Establishments are viewable by everyone" 
    ON public.establishments FOR SELECT 
    USING (true);

CREATE POLICY "Owners can insert their own establishment" 
    ON public.establishments FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own establishment" 
    ON public.establishments FOR UPDATE 
    USING (auth.uid() = owner_id);

-- Add establishment_id to other tables
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);
ALTER TABLE public.barbeiros ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

-- Add RLS policies for linked tables to allow access based on establishment_id
-- (Assuming we want to filter by establishment_id)

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_establishments_slug ON public.establishments(slug);
CREATE INDEX IF NOT EXISTS idx_servicos_establishment_id ON public.servicos(establishment_id);
CREATE INDEX IF NOT EXISTS idx_barbeiros_establishment_id ON public.barbeiros(establishment_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_establishment_id ON public.agendamentos(establishment_id);
