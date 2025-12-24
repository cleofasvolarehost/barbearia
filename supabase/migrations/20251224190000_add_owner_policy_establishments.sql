DROP POLICY IF EXISTS allow_owner ON establishments; 
CREATE POLICY allow_owner ON establishments 
  FOR ALL 
  USING (owner_id = auth.uid()) 
  WITH CHECK (owner_id = auth.uid());