-- Adicionar coluna para configurações de WhatsApp (Wordnet)
ALTER TABLE barbeiros ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}'::jsonb;

-- Política de segurança: O dono só pode ver/editar sua própria configuração
CREATE POLICY "Owners can manage their whatsapp config" ON barbeiros
    FOR UPDATE USING (auth.uid() = id);
