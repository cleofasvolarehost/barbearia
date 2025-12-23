-- Enable public read access for booking flow tables

-- Establishments
DROP POLICY IF EXISTS "Public establishments are viewable by everyone" ON establishments;
CREATE POLICY "Public establishments are viewable by everyone"
ON establishments FOR SELECT
TO anon, authenticated
USING (true);

-- Services
DROP POLICY IF EXISTS "Services are viewable by everyone" ON servicos;
CREATE POLICY "Services are viewable by everyone"
ON servicos FOR SELECT
TO anon, authenticated
USING (true);

-- Barbers
DROP POLICY IF EXISTS "Barbers are viewable by everyone" ON barbeiros;
CREATE POLICY "Barbers are viewable by everyone"
ON barbeiros FOR SELECT
TO anon, authenticated
USING (true);
