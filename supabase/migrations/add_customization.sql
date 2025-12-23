-- Adicionar campos de personalização e slug para cada barbeiro/loja
-- Vamos adicionar na tabela 'barbeiros' assumindo que cada barbeiro pode ter sua página, 
-- OU se for um sistema onde um DONO tem uma barbearia com vários barbeiros, deveríamos criar uma tabela 'lojas'.
-- Dado o contexto "cada barbeiro tenha sua identidade", vamos tratar cada barbeiro como uma "entidade" que pode ter sua página.

ALTER TABLE barbeiros ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE barbeiros ADD COLUMN nome_barbearia TEXT;
ALTER TABLE barbeiros ADD COLUMN cor_primaria TEXT DEFAULT '#7C3AED'; -- Roxo padrão
ALTER TABLE barbeiros ADD COLUMN cor_secundaria TEXT DEFAULT '#2DD4BF'; -- Verde padrão
ALTER TABLE barbeiros ADD COLUMN banner_url TEXT;
ALTER TABLE barbeiros ADD COLUMN logo_url TEXT;

-- Garantir que slugs sejam únicos e válidos (letras minúsculas, números e hifens)
-- Isso geralmente é validado no backend/frontend, mas o UNIQUE no banco garante integridade.
