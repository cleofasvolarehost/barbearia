
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkobtnufnijptgvvxrhq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrb2J0bnVmbmlqcHRndnZ4cmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE3MDk2OSwiZXhwIjoyMDgxNzQ2OTY5fQ.45_wJKe39LTWUweyAGQ_ogEMiz7Si6Z2aXi8WU8RRuY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createBarbers() {
    console.log('🚀 Starting creation of example barbers...');

    // 1. Get the first establishment found (assuming it's the one created)
    const { data: establishments, error: estError } = await supabase
        .from('establishments')
        .select('id, name')
        .limit(1);

    if (estError || !establishments || establishments.length === 0) {
        console.error('❌ No establishment found. Please create one in the dashboard first.');
        return;
    }

    const establishment = establishments[0];
    console.log(`✅ Found establishment: ${establishment.name} (ID: ${establishment.id})`);

    const barbers = [
        {
            email: 'carlos.corte@exemplo.com',
            password: 'senha123456',
            name: 'Carlos Tesoura',
            phone: '11999990001',
            bio: 'Especialista em cortes clássicos e barba na toalha quente.'
        },
        {
            email: 'ana.fade@exemplo.com',
            password: 'senha123456',
            name: 'Ana Navalha',
            phone: '11999990002',
            bio: 'Mestra em degradê e cortes modernos.'
        }
    ];

    for (const barber of barbers) {
        console.log(`\nCreating barber: ${barber.name}...`);

        // 2. Create Auth User
        // We use createUser which returns the user if created, or error if exists.
        // If it exists, we try to sign in or just get the user by email to update roles.
        // But for simplicity in this script, let's assume we might get an error if they exist and we'll handle finding them.
        
        let userId;

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: barber.email,
            password: barber.password,
            email_confirm: true,
            user_metadata: { name: barber.name }
        });

        if (authError) {
            console.log(`   ℹ️ User likely exists (${authError.message}). Fetching by email...`);
            // Try to find the user
            // admin.listUsers is one way, or just assume we can't get ID easily without more privs or search.
            // Actually listUsers allows filtering by email? No, it lists pages.
            // Let's try to just get the profile from public.usuarios if auth failed (assuming sync happened)
            // OR use a trick: sign in? No, we are admin.
            // Let's assume for this script we only create if not exists.
            // But wait, we need the ID to insert into 'barbeiros'.
            
            // NOTE: admin.createUser doesn't return ID if fails. 
            // We can search for the user in public.usuarios by email if they were synced.
            const { data: existingUser } = await supabase
                .from('usuarios')
                .select('id')
                .eq('email', barber.email)
                .single();
            
            if (existingUser) {
                userId = existingUser.id;
                console.log(`   ✅ Found existing user ID: ${userId}`);
            } else {
                console.error(`   ❌ Could not find user ID for ${barber.email}. Skipping.`);
                continue;
            }
        } else {
            userId = authUser.user.id;
            console.log(`   ✅ Auth user created (ID: ${userId})`);
        }

        // 3. Create Public Profile (usuarios) - Check if trigger already created it
        // The trigger 'handle_new_user' usually creates this, but let's update/upsert to be sure and set type='barber'
        const { error: profileError } = await supabase
            .from('usuarios')
            .upsert({
                id: userId,
                email: barber.email,
                nome: barber.name,
                telefone: barber.phone,
                tipo: 'barber', // Important!
                created_at: new Date()
            });

        if (profileError) {
            console.error(`   ❌ Error updating profile:`, profileError.message);
            continue;
        }
        console.log(`   ✅ Profile updated in 'usuarios' with role 'barber'`);

        // 4. Add to 'barbeiros' table
        // CORRECTION: 'especialidades' (array) -> 'especialidade' (string)
        const { error: barberTableError } = await supabase
            .from('barbeiros')
            .upsert({ // Changed to upsert to update if exists
                user_id: userId,
                establishment_id: establishment.id,
                nome: barber.name,
                especialidade: 'Corte, Barba', // Fixed column name and type
                foto_url: null, 
                bio: barber.bio,
                ativo: true,
                slug: barber.name.toLowerCase().replace(/\s+/g, '-') // Added slug as it is unique and required usually
            }, { onConflict: 'user_id' }); // Avoid duplicates if user is already a barber

        if (barberTableError) {
            console.error(`   ❌ Error adding to 'barbeiros' table:`, barberTableError.message);
        } else {
            console.log(`   ✅ Added/Updated 'barbeiros' table linked to establishment.`);
        }
    }

    console.log('\n✨ Done! Two barbers processed.');
}

createBarbers();
