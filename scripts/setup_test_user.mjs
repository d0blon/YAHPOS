import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bddpzqayurvhgpllykku.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHB6cWF5dXJ2aGdwbGx5a2t1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg0ODQxNCwiZXhwIjoyMDkwNDI0NDE0fQ.W3I5xzSR469ndL4FUU13_PJM0HWMB49PARrK4qlYC38';

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
