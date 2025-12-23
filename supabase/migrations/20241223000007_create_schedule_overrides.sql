-- Create schedule_overrides table
CREATE TABLE IF NOT EXISTS public.schedule_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID REFERENCES public.barbeiros(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    type TEXT CHECK (type IN ('full_day', 'custom_slot')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schedule_overrides ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON public.schedule_overrides
    FOR SELECT USING (true);

CREATE POLICY "Owners and Barbers can manage overrides" ON public.schedule_overrides
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM public.establishments WHERE id = schedule_overrides.establishment_id
        ) OR 
        auth.uid() IN (
            SELECT usuario_id FROM public.barbeiros WHERE id = schedule_overrides.barber_id
        )
    );

-- Add index for performance
CREATE INDEX idx_schedule_overrides_barber_date ON public.schedule_overrides(barber_id, start_time);
