import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { parseBody } from '@/lib/validations/http'
import { subscriptionSchema } from '@/lib/validations/api'

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
      .select('id, store_id, tier_id, status, current_period_start, current_period_end, created_at, updated_at, tier:subscription_tiers(id, name, slug, price_clp, max_products, max_users, max_terminals, features)')
      .eq('store_id', profile.store_id)
      .single();

    // 2. Obtener todos los tiers disponibles
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('id, name, slug, price_clp, max_products, max_users, max_terminals, features')
      .order('price_clp', { ascending: true })
      .limit(50);

    if (tiersError) {
      return NextResponse.json({ error: tiersError.message }, { status: 500 });
    }

    if (subError && subError.code !== 'PGRST116') { // Ignorar si no hay suscripción aún
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    return NextResponse.json({
      subscription: subscription || null,
      tiers: tiers
    });
  } catch (error) {
    console.error('[GET /api/subscriptions] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
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

    const parsed = await parseBody(req, subscriptionSchema);
    if ('error' in parsed) return parsed.error;
    const tierId = parsed.data.tierId ?? parsed.data.tier_id;

    // Actualizar o insertar la suscripción (Simulación de cambio de plan)
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        store_id: profile.store_id,
        tier_id: tierId,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'store_id' })
      .select('id, store_id, tier_id, status, current_period_start, current_period_end, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, subscription: data });
  } catch (error) {
    console.error('[PATCH /api/subscriptions] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
