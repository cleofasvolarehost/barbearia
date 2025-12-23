-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    tipo VARCHAR(20) DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    categoria VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE barbeiros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100),
    foto_url TEXT,
    bio TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    barbeiro_id UUID REFERENCES barbeiros(id),
    data DATE NOT NULL,
    horario TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
    preco_total DECIMAL(10,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data, horario, barbeiro_id)
);

CREATE TABLE agendamentos_servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
    servico_id UUID REFERENCES servicos(id)
);

-- Create indexes
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_servicos_categoria ON servicos(categoria);
CREATE INDEX idx_servicos_ativo ON servicos(ativo);
CREATE INDEX idx_barbeiros_ativo ON barbeiros(ativo);
CREATE INDEX idx_agendamentos_usuario ON agendamentos(usuario_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data);
CREATE INDEX idx_agendamentos_status ON agendamentos(status);
CREATE INDEX idx_agendamentos_servicos_agendamento ON agendamentos_servicos(agendamento_id);
CREATE INDEX idx_agendamentos_servicos_servico ON agendamentos_servicos(servico_id);

-- RLS Policies
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_servicos ENABLE ROW LEVEL SECURITY;

-- Allow public read access to services and barbers
CREATE POLICY "Public services are viewable by everyone" ON servicos
    FOR SELECT USING (true);

CREATE POLICY "Public barbers are viewable by everyone" ON barbeiros
    FOR SELECT USING (true);

-- Allow authenticated users to manage their own data
CREATE POLICY "Users can view their own data" ON usuarios
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON usuarios
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to view their own appointments
-- Note: We are assuming auth.uid() matches the usuario_id (which might require a trigger to sync auth.users with public.usuarios or using auth.users directly)
-- For simplicity in this architecture, we usually link auth.users id to public.usuarios id.
-- Let's assume the registration process handles the creation of public.usuarios with the same ID as auth.users.
-- However, since `id` in `usuarios` is `DEFAULT uuid_generate_v4()`, it might differ if not explicitly set.
-- A better approach for Supabase is to use a trigger to create a public user profile when a new auth user is created.
-- For now, let's keep the policy as defined in the technical doc but we might need to adjust the insertion logic.

CREATE POLICY "Users can view their own appointments" ON agendamentos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can create appointments" ON agendamentos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own appointments" ON agendamentos
    FOR UPDATE USING (auth.uid() = usuario_id);

-- Insert some initial data for services
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, categoria) VALUES
('Corte de Cabelo', 'Corte tradicional ou moderno com tesoura e máquina.', 50.00, 45, 'Cabelo'),
('Barba Completa', 'Modelagem de barba com toalha quente e navalha.', 40.00, 30, 'Barba'),
('Combo Corte + Barba', 'Serviço completo de cabelo e barba.', 80.00, 75, 'Combo'),
('Pezinho', 'Acabamento do corte e contorno.', 20.00, 15, 'Acabamento');

-- Insert some initial data for barbers
INSERT INTO barbeiros (nome, especialidade, bio) VALUES
('Carlos Silva', 'Cortes Clássicos', 'Especialista em cortes tradicionais com 10 anos de experiência.'),
('André Santos', 'Barba e Navalha', 'Mestre na arte da barbearia clássica e toalha quente.'),
('Ricardo Oliveira', 'Cortes Modernos', 'Sempre atualizado com as últimas tendências de estilo.');
