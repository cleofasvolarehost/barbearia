-- Allow anonymous inserts to usuarios (needed for guest booking flow)
-- IMPORTANT: This allows anyone to create a user profile if they know the endpoint.
-- In a real production app, you might want to wrap this in a stricter function or use Edge Functions.
CREATE POLICY "Public can insert users" ON usuarios
    FOR INSERT WITH CHECK (true);

-- Allow public read access to usuarios so we can check if a phone exists
-- Restricting to only necessary columns would be better, but RLS works on rows.
-- We will rely on the app logic to only query by phone.
CREATE POLICY "Public can view users" ON usuarios
    FOR SELECT USING (true);

-- Allow public inserts to appointments (for guests)
CREATE POLICY "Public can insert appointments" ON agendamentos
    FOR INSERT WITH CHECK (true);
