-- Add preco column to agendamentos_servicos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'agendamentos_servicos'
        AND column_name = 'preco'
    ) THEN
        ALTER TABLE agendamentos_servicos ADD COLUMN preco DECIMAL(10,2);
    END IF;
END $$;
