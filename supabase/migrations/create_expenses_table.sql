-- Create Expenses (Despesas) table if not exists
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID REFERENCES public.establishments(id) NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  categoria TEXT, -- 'aluguel', 'produtos', 'energia', 'outros'
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage their expenses" 
ON public.despesas
FOR ALL
USING (auth.uid() = (SELECT owner_id FROM public.establishments WHERE id = establishment_id));

-- Add Index
CREATE INDEX IF NOT EXISTS idx_despesas_establishment ON public.despesas(establishment_id);
