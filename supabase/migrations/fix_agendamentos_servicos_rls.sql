-- Fix RLS for agendamentos_servicos to allow clients to see their service details
ALTER TABLE public.agendamentos_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for involved parties" ON public.agendamentos_servicos;

CREATE POLICY "Enable read access for involved parties" ON public.agendamentos_servicos
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.agendamentos a
        WHERE a.id = agendamentos_servicos.agendamento_id
        AND (
            a.usuario_id = auth.uid() -- Client
            OR a.barbeiro_id = auth.uid() -- Barber
            OR EXISTS ( -- Owner
                SELECT 1 FROM public.establishments e 
                WHERE e.id = a.establishment_id 
                AND e.owner_id = auth.uid()
            )
        )
    )
);

-- Allow clients to insert services for their own appointments
DROP POLICY IF EXISTS "Enable insert for clients" ON public.agendamentos_servicos;
CREATE POLICY "Enable insert for clients" ON public.agendamentos_servicos
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.agendamentos a
        WHERE a.id = agendamentos_servicos.agendamento_id
        AND a.usuario_id = auth.uid()
    )
);

-- Grant permissions to ensure no basic block
GRANT ALL ON public.agendamentos_servicos TO authenticated;
GRANT ALL ON public.agendamentos_servicos TO anon;
