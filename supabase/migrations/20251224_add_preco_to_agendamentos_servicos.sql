-- Migration: Ensure preco column exists on agendamentos_servicos
-- Purpose: Fix runtime errors where the preco column is missing in some environments
-- Reference: "column 'preco' of relation 'agendamentos_servicos' does not exist"
-- This migration is idempotent and can be safely applied multiple times

ALTER TABLE agendamentos_servicos
ADD COLUMN IF NOT EXISTS preco DECIMAL(10,2);
