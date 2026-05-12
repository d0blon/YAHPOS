import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { generateAIText } from '@/lib/ai/openai';
import { aiDescriptionSchema } from '@/lib/validations/ai';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    // 1. Verificar Autenticación
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener Perfil y StoreId
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'No se encontró tienda asociada' }, { status: 403 });
    }

    // 3. Verificar Plan (Solo Élite tiene acceso a IA avanzada)
    const { data: store } = await supabase
      .from('stores')
      .select('tier')
      .eq('id', profile.store_id)
      .single();

    if (store?.tier !== 'patagonia') {
      return NextResponse.json({ 
        error: 'Esta función requiere el plan Élite.',
        currentTier: store?.tier 
      }, { status: 403 });
    }

    // 4. Procesar y Validar Body
    const body = await req.json();
    const validated = aiDescriptionSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos', 
        details: validated.error.issues 
      }, { status: 400 });
    }

    const { productName, productCategory, attributes, tone = 'profesional' } = validated.data;

    // 5. Construir Prompt
    const systemPrompt = `Eres un redactor experto en marketing de e-commerce de lujo. 
    Tu objetivo es crear descripciones de productos que cautiven y vendan.
    Usa un tono ${tone}. 
    Formatea la salida con párrafos cortos y una lista de beneficios clave.`;

    const userPrompt = `Genera una descripción persuasiva para el siguiente producto:
    - Nombre: ${productName}
    - Categoría: ${productCategory || 'General'}
    - Atributos clave: ${attributes || 'No especificados'}
    
    Por favor, incluye:
    1. Un título gancho.
    2. Una descripción de 2-3 párrafos.
    3. Una lista de 3-5 características principales en formato bullet points.`;

    // 6. Generar con IA
    const result = await generateAIText(userPrompt, systemPrompt, {
      storeId: profile.store_id,
      userId: user.id,
      feature: 'product_description',
      model: 'gpt-4o-mini' // Modelo balanceado costo/calidad
    });

    if (!result.success) {
      throw new Error(result.error as any);
    }

    return NextResponse.json({ 
      description: result.content,
      usage: { cost: result.cost }
    });

  } catch (error: any) {
    console.error('[API AI] Error:', error);
    return NextResponse.json({ error: 'Error interno al generar descripción' }, { status: 500 });
  }
}
