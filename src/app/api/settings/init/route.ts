import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST() {
  try {
    // settings/init requires admin-level access — use createAdminClient
    // but since createServerClient is removed, we use createClient for now
    const supabase = await createClient()

    const { error: migrationsError } = await (supabase as any).rpc('exec_sql', {
      sql: `
        -- Ensure CRM Columns exist
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rut TEXT UNIQUE;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_full_account BOOLEAN DEFAULT false;
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_rut TEXT;
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS register_id INTEGER;
        
        -- Ensure other tables exist (Settings)
        CREATE TABLE IF NOT EXISTS public.settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    if (migrationsError) {
      return NextResponse.json({ 
        message: 'Error en migraciones automáticas. Es posible que necesite configurar el RPC exec_sql en Supabase.',
        error: migrationsError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'Base de datos inicializada/actualizada correctamente' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
