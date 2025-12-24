-- Migration para criar tabelas de planos e assinaturas para checkout Iugu

-- Criar tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    intervalo VARCHAR(20) DEFAULT 'monthly' CHECK (intervalo IN ('monthly', 'yearly')),
    beneficios JSONB DEFAULT '[]',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de assinaturas (usando user_id ao invés de barbeiro_id)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plano_id UUID REFERENCES public.plans(id),
    iugu_subscription_id VARCHAR(100) UNIQUE,
    iugu_customer_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_proximo_ciclo TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_iugu_id ON public.subscriptions(iugu_subscription_id);
CREATE INDEX IF NOT EXISTS idx_plans_ativo ON public.plans(ativo);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para updated_at (sem IF NOT EXISTS para compatibilidade)
DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Inserir planos iniciais
INSERT INTO public.plans (nome, descricao, preco, intervalo, beneficios) VALUES 
('Premium Mensal', 'Acesso completo a todos os recursos premium', 29.90, 'monthly', '["Agendamento ilimitado", "Relatórios avançados", "Suporte prioritário", "Notificações push"]'),
('Premium Anual', 'Acesso premium com desconto anual (2 meses grátis)', 299.90, 'yearly', '["Agendamento ilimitado", "Relatórios avançados", "Suporte prioritário", "Notificações push", "2 meses grátis"]'),
('Básico Mensal', 'Plano essencial para barbearias iniciantes', 19.90, 'monthly', '["Até 100 agendamentos/mês", "Relatórios básicos", "Suporte via email"]');

-- Configurar permissões Supabase
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.subscriptions TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.plans TO authenticated;
GRANT ALL PRIVILEGES ON public.subscriptions TO authenticated;