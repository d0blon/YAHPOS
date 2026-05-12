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

    // Obtener todas las configuraciones de la tabla settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', profile.store_id);

    // Convertir array de {key, value} a un objeto plano
    const flatSettings: Record<string, any> = {};
    settingsData?.forEach(s => {
      flatSettings[s.key] = s.value;
    });

    // Estructurar los datos para el frontend
    // Mapeamos los campos planos a la estructura que el AdminPanel espera
    const structured = {
      store: {
        name: flatSettings.store_name || '',
        slogan: flatSettings.store_slogan || '',
        address: flatSettings.store_address || '',
        city: flatSettings.store_city || '',
        phone: flatSettings.store_phone || '',
        email: flatSettings.store_email || '',
        website: flatSettings.store_website || '',
      },
      pos: {
        terminalName: flatSettings.pos_terminal_name || '',
        taxRate: Number(flatSettings.pos_tax_rate || 19),
        currency: flatSettings.pos_currency || 'CLP',
        lowStockThreshold: Number(flatSettings.pos_low_stock_threshold || 5),
        receiptMessage: flatSettings.receipt_message || '¡Gracias por su compra!',
        paymentCash: flatSettings.pos_payment_cash === 'true',
        paymentTransbank: flatSettings.pos_payment_transbank === 'true',
        paymentGetnet: flatSettings.pos_payment_getnet === 'true',
        paymentTuu: flatSettings.pos_payment_tuu === 'true',
        paymentSumup: flatSettings.pos_payment_sumup === 'true',
        paymentOtherCard: flatSettings.pos_payment_other_card === 'true',
        paymentTransfer: flatSettings.pos_payment_transfer === 'true',
      },
      payments: {
        flowEnabled: flatSettings.payment_flow_enabled === 'true',
        flowApiKey: flatSettings.payment_flow_api_key || '',
        flowApiSecret: flatSettings.payment_flow_api_secret || '',
        webpayEnabled: flatSettings.payment_webpay_enabled === 'true',
        webpayCommerceCode: flatSettings.payment_webpay_commerce_code || '',
        freeShippingMin: Number(flatSettings.payment_free_shipping_min || 0),
      },
      loyalty: {
        enabled: flatSettings.loyalty_enabled === 'true',
        minRedemption: Number(flatSettings.loyalty_min_redemption || 0),
        accumulationRate: Number(flatSettings.loyalty_accumulation_rate || 100),
        redemptionRate: Number(flatSettings.loyalty_redemption_rate || 1),
        requireIdVerification: flatSettings.loyalty_require_id_verification === 'true',
        name: flatSettings.loyalty_name || 'Puntos',
      },
      appearance: {
        logoUrl: flatSettings.appearance_logo_url || '',
        primaryColor: flatSettings.appearance_primary_color || '#1e3a6e',
        secondaryColor: flatSettings.appearance_secondary_color || '#f5c518',
        darkMode: flatSettings.appearance_dark_mode === 'true',
      },
      design: {
        heroImage: flatSettings.design_hero_image || '',
        heroTitle: flatSettings.design_hero_title || '',
        showPromotions: flatSettings.design_show_promotions === 'true',
        productCardStyle: flatSettings.design_product_card_style || 'glass',
        bannerType: flatSettings.design_banner_type || 'simple',
      },
      receipt: {
        message: flatSettings.receipt_message || '¡Gracias por su compra!',
        showLogo: flatSettings.receipt_show_logo !== 'false',
        colorMode: flatSettings.receipt_color_mode || 'bw',
        showPoweredBy: flatSettings.receipt_show_powered_by !== 'false',
        poweredByText: flatSettings.receipt_powered_by_text || 'Powered by YAHPOS!.cl',
      }
    };

    return NextResponse.json({
      settings: structured,
      usingDefaults: !settingsData || settingsData.length === 0
    });
  } catch (error: any) {
    console.error('[GET /api/settings] Error:', error)
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

    const body = await req.json();
    
    // El body viene como un objeto plano de settings (ej: { loyalty_enabled: 'true', ... })
    // Lo convertimos a un formato que podamos upsertar en la tabla settings
    const upsertData = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      store_id: profile.store_id
    }));

    const { error } = await supabase
      .from('settings')
      .upsert(upsertData, { onConflict: 'key,store_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/settings] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
