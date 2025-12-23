
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkobtnufnijptgvvxrhq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb2J0bnVmbmlqcHRndnZ4cmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE3MDk2OSwiZXhwIjoyMDgxNzQ2OTY5fQ.45_wJKe39LTWUweyAGQ_ogEMiz7Si6Z2aXi8WU8RRuY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnose() {
    const targetUserId = '4be6aa0c-a68b-4ed1-8e5d-2efe1f420687';
    console.log(`Diagnosing User ID: ${targetUserId}\n`);

    // 1. Check public.usuarios
    console.log('1. Checking table public.usuarios...');
    const { data: publicUser, error: publicError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', targetUserId)
        .single();
    
    if (publicUser) {
        console.log('✅ Found in public.usuarios:');
        console.log(`   Name: ${publicUser.nome}`);
        console.log(`   Email: ${publicUser.email}`);
        console.log(`   Role: ${publicUser.tipo}`);
    } else {
        console.log('❌ Not found in public.usuarios');
        if (publicError) console.log(`   Error: ${publicError.message}`);
    }

    console.log('\n-----------------------------------\n');

    // 2. Check auth.users
    console.log('2. Checking auth.users (Supabase Auth System)...');
    const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(targetUserId);

    if (authUser) {
        console.log('✅ Found in auth.users:');
        console.log(`   Email: ${authUser.email}`);
        console.log(`   Last Sign In: ${authUser.last_sign_in_at}`);
    } else {
        console.log('❌ Not found in auth.users (THIS IS THE PROBLEM!)');
        if (authError) console.log(`   Error: ${authError.message}`);
    }

    console.log('\n-----------------------------------\n');
    
    if (publicUser && !authUser) {
        console.log('⚠️ CONCLUSION: INCONSISTENCY DETECTED!');
        console.log('The user exists in your App Database (public) but was DELETED from Supabase Auth.');
        console.log('Solution: You should delete this orphan record from public.usuarios.');
    } else if (publicUser && authUser) {
        console.log('✅ User exists in both places. Password reset should work.');
    } else {
        console.log('❓ User not found anywhere.');
    }
}

diagnose();
