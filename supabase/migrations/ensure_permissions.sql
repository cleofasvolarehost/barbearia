-- Ensure permissions for authenticated users on establishments
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Establishments are viewable by everyone" ON public.establishments;
DROP POLICY IF EXISTS "Owners can insert their own establishment" ON public.establishments;
DROP POLICY IF EXISTS "Owners can update their own establishment" ON public.establishments;
DROP POLICY IF EXISTS "Owners can delete their own establishment" ON public.establishments;

-- Re-create policies
CREATE POLICY "Establishments are viewable by everyone" 
    ON public.establishments FOR SELECT 
    USING (true);

CREATE POLICY "Owners can insert their own establishment" 
    ON public.establishments FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own establishment" 
    ON public.establishments FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own establishment" 
    ON public.establishments FOR DELETE 
    USING (auth.uid() = owner_id);

-- Ensure sequences and public schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
