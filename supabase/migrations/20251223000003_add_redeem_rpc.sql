CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_user_id UUID,
  p_establishment_id UUID,
  p_points INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  -- Check current points
  SELECT points INTO v_current_points
  FROM loyalty_cards
  WHERE user_id = p_user_id AND establishment_id = p_establishment_id;

  IF v_current_points IS NULL OR v_current_points < p_points THEN
    RAISE EXCEPTION 'Saldo de pontos insuficiente.';
  END IF;

  -- Update card (Subtract points and increment redeemed count)
  UPDATE loyalty_cards
  SET 
    points = points - p_points,
    rewards_redeemed = rewards_redeemed + 1,
    updated_at = now()
  WHERE user_id = p_user_id AND establishment_id = p_establishment_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
