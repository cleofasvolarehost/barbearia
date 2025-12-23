-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
    p_user_id UUID,
    p_establishment_id UUID,
    p_points INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- Check current points
    SELECT points INTO current_points
    FROM loyalty_cards
    WHERE user_id = p_user_id AND establishment_id = p_establishment_id;

    IF current_points IS NULL OR current_points < p_points THEN
        RAISE EXCEPTION 'Saldo de pontos insuficiente.';
    END IF;

    -- Update points and rewards count
    UPDATE loyalty_cards
    SET 
        points = points - p_points,
        rewards_redeemed = COALESCE(rewards_redeemed, 0) + 1,
        updated_at = now()
    WHERE user_id = p_user_id AND establishment_id = p_establishment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
