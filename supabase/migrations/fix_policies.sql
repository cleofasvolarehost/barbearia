-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own data" ON usuarios
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Just in case, grant usage on the sequence if there was one (but we use UUIDs)
-- Also ensure authenticated users have permission to insert
GRANT INSERT ON usuarios TO authenticated;
