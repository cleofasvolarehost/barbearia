const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://vkobtnufnijptgvvxrhq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb2J0bnVmbmlqcHRndnZ4cmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE3MDk2OSwiZXhwIjoyMDgxNzQ2OTY5fQ.45_wJKe39LTWUweyAGQ_ogEMiz7Si6Z2aXi8WU8RRuY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase };