-- IUGU Self-Managed Billing schema changes

-- 1) subscriptions table enhancements for gateway-agnostic control
-- Add columns if they do not exist
DO $$
BEGIN
  -- establishment_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'establishment_id'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN establishment_id uuid REFERENCES public.establishments(id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_establishment_id ON public.subscriptions(establishment_id);
  END IF;

  -- current_period_end
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN current_period_end timestamptz;
    CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
  END IF;

  -- iugu_subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'iugu_subscription_id'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN iugu_subscription_id text;
  END IF;

  -- last_payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'last_payment_status'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN last_payment_status text;
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_last_payment_status_chk CHECK (last_payment_status = ANY (ARRAY['paid','failed']));
  END IF;

  -- retry_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN retry_count integer DEFAULT 0;
  END IF;
END $$;

-- 2) Adjust status constraint to include new states (past_due, trialing)
DO $$
BEGIN
  -- Drop existing check constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;

  -- Some environments name it differently; try generic pattern
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'c' AND conname LIKE '%status%'
  ) THEN
    -- Do nothing; handled above or will be replaced below
  END IF;

  -- Add a broader constraint
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_chk CHECK (
      status = ANY (ARRAY['pending','active','canceled','failed','past_due','trialing'])
    );
END $$;

-- 3) Backfill establishment_id from owner mapping (best effort)
UPDATE public.subscriptions s
SET establishment_id = e.id
FROM public.establishments e
WHERE s.establishment_id IS NULL AND e.owner_id = s.user_id;

-- 4) Helper view (optional) to ease dunning queries
CREATE OR REPLACE VIEW public.v_subscriptions_dunning AS
SELECT 
  s.id,
  s.establishment_id,
  s.user_id,
  s.plan_id,
  s.status,
  s.current_period_end,
  s.last_payment_status,
  s.retry_count,
  (NOW() - COALESCE(s.current_period_end, NOW())) AS period_diff
FROM public.subscriptions s;

