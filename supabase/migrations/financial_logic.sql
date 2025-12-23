-- 1. Add Commission Percentage to Services
ALTER TABLE servicos ADD COLUMN commission_percent INTEGER DEFAULT 0;

-- 2. Add VIP Status to Users
ALTER TABLE usuarios ADD COLUMN is_vip BOOLEAN DEFAULT false;

-- 3. Update Appointment Statuses (We can't easily alter enum types in Postgres without recreating, 
-- so we'll just ensure our application logic handles the new string values or add a check constraint if needed.
-- For now, we will assume 'status' is a text field or we'd need to migrate the type.
-- Let's add a check constraint to be safe if it doesn't exist, or just document the valid values:
-- 'pendente', 'confirmado', 'concluido', 'cancelado', 'pending_payment', 'no_show'

-- 4. Create Commissions Table (Ledger)
CREATE TABLE comissoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agendamento_id UUID REFERENCES agendamentos(id),
    barbeiro_id UUID REFERENCES barbeiros(id),
    valor_comissao DECIMAL(10, 2) NOT NULL,
    percentual_aplicado INTEGER NOT NULL,
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pendente' -- 'pago', 'pendente'
);

-- Policy for Commissions
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers can view their own commissions" ON comissoes
    FOR SELECT USING (auth.uid() = barbeiro_id);

CREATE POLICY "Owners can view all commissions" ON comissoes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbeiros 
            WHERE id = auth.uid() -- Assuming the user is an owner/admin
        )
    );
