
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkobtnufnijptgvvxrhq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb2J0bnVmbmlqcHRndnZ4cmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE3MDk2OSwiZXhwIjoyMDgxNzQ2OTY5fQ.45_wJKe39LTWUweyAGQ_ogEMiz7Si6Z2aXi8WU8RRuY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteOrphan() {
    const targetUserId = '4be6aa0c-a68b-4ed1-8e5d-2efe1f420687';
    console.log(`Deleting User ID: ${targetUserId} from public.usuarios...`);

    const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', targetUserId);

    if (error) {
        console.error('❌ Error deleting user:', error.message);
    } else {
        console.log('✅ User deleted successfully from public.usuarios.');
    }
}

deleteOrphan();
