-- Add pending_plan_change column to establishments
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS pending_plan_change JSONB DEFAULT NULL;

-- Example structure: { "plan_id": "...", "plan_name": "...", "effective_date": "..." }
