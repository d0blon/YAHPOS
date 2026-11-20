import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ejecuta con: node --env-file=.env.local scripts/setup_test_user.mjs');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  const email = 'antigravity@patagoniapos.cl';
  const password = 'TestingPassword123!';
  
  console.log('--- Configurando Usuario de Pruebas ---');
  
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'developer' }
  });
  
  if (authError) {
    console.log('ℹ️ Auth:', authError.message);
  } else {
    console.log('✅ Usuario creado en Auth.');
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'developer',
        rut: '77.777.777-7',
        first_name: 'Antigravity',
        last_name: 'Tester'
      })
      .eq('id', existing.id);
    
    if (updateError) console.error('❌ Error actualizando:', updateError.message);
    else console.log('🚀 Usuario existente actualizado a DEVELOPER.');
  } else {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        email,
        rut: '77.777.777-7',
        first_name: 'Antigravity',
        last_name: 'Tester',
        role: 'developer'
      });
    
    if (insertError) console.error('❌ Error insertando:', insertError.message);
    else console.log('🚀 Nuevo usuario creado y promovido a DEVELOPER.');
  }
}

setup();
