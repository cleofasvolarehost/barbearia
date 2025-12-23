-- Create Loyalty Cards Table
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  establishment_id UUID REFERENCES establishments(id) NOT NULL,
  points INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  rewards_redeemed INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, establishment_id)
);

-- Enable RLS
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own loyalty card" ON loyalty_cards;
CREATE POLICY "Users can view their own loyalty card" 
  ON loyalty_cards FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can view/update loyalty cards for their shop" ON loyalty_cards;
CREATE POLICY "Owners can view/update loyalty cards for their shop"
  ON loyalty_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM establishments 
      WHERE id = loyalty_cards.establishment_id 
      AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Barbers can view/update loyalty cards for their shop" ON loyalty_cards;
CREATE POLICY "Barbers can view/update loyalty cards for their shop"
  ON loyalty_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM barbeiros 
      WHERE user_id = auth.uid() 
      AND establishment_id = loyalty_cards.establishment_id
    )
  );

-- Trigger to Auto-Update Points on Appointment Completion
CREATE OR REPLACE FUNCTION update_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    v_establishment_id UUID;
    v_client_auth_id UUID;
BEGIN
    -- Only run if status changed to 'concluido' (completed)
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        
        -- Get establishment_id from appointment
        v_establishment_id := NEW.establishment_id;
        
        -- Get client auth id (assuming usuario_id in agendamentos matches auth.users.id)
        -- If agendamentos.usuario_id points to 'usuarios' table, we need to ensure 'usuarios.id' is the auth id.
        -- Based on previous analysis, user.id from auth is used to query agendamentos.
        v_client_auth_id := NEW.usuario_id;

        IF v_client_auth_id IS NOT NULL THEN
            -- Insert or Update Loyalty Card
            INSERT INTO loyalty_cards (user_id, establishment_id, points, total_visits, last_visit_at)
            VALUES (v_client_auth_id, v_establishment_id, 1, 1, now())
            ON CONFLICT (user_id, establishment_id)
            DO UPDATE SET 
                points = loyalty_cards.points + 1,
                total_visits = loyalty_cards.total_visits + 1,
                last_visit_at = now(),
                updated_at = now();
        END IF;
    END IF;
    
    -- Optional: Handle cancellation (remove point?) - Maybe too complex for now, let's stick to adding.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Definition
DROP TRIGGER IF EXISTS trigger_update_loyalty_points ON agendamentos;
CREATE TRIGGER trigger_update_loyalty_points
AFTER UPDATE ON agendamentos
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_points();
