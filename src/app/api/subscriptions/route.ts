import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'No store' }, { status: 403 });

    // 1. Obtener la suscripción actual de la tienda
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, tier:subscription_tiers(*)')
      .eq('store_id', profile.store_id)
      .single();

    // 2. Obtener todos los tiers disponibles
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_clp', { ascending: true });

    if (subError && subError.code !== 'PGRST116') { // Ignorar si no hay suscripción aún
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    return NextResponse.json({
      subscription: subscription || null,
      tiers: tiers || []
    });
  } catch (error: any) {
    console.error('[GET /api/subscriptions] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'No store' }, { status: 403 });

    const { tierId } = await req.json();

    if (!tierId) return NextResponse.json({ error: 'Falta tierId' }, { status: 400 });

    // Actualizar o insertar la suscripción (Simulación de cambio de plan)
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        store_id: profile.store_id,
        tier_id: tierId,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, subscription: data });
  } catch (error: any) {
    console.error('[PATCH /api/subscriptions] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
