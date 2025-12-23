-- Adicionar owner_id (dono da barbearia) aos serviços para permitir catálogos diferentes por loja
ALTER TABLE servicos ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- Adicionar owner_id aos agendamentos para facilitar queries por loja
-- (Embora já tenhamos barbeiro_id, o owner_id ajuda a separar "A Loja" do "Profissional" se crescermos)
ALTER TABLE agendamentos ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- Política de Segurança (RLS) - Importante para SaaS
-- Por enquanto, vamos permitir leitura pública para serviços (para o cliente ver),
-- mas escrita apenas pelo dono.
CREATE POLICY "Public can view services" ON servicos FOR SELECT USING (true);
CREATE POLICY "Owners can manage their services" ON servicos USING (auth.uid() = owner_id);
