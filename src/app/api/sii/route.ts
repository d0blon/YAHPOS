import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Aquí es donde en producción interceptamos con SimpleAPI o LibreDTE:
    // const sRes = await fetch(process.env.SIMPLE_API_URL + '/api/v1/boleta', { 
    //   headers: { "Authorization": `Bearer ${process.env.SIMPLE_API_KEY}` }, body 
    // })

    console.log('[SII API Mock] Recibida orden para emisión de Boleta Electrónica:', body);

    // Simulamos un retraso de procesamiento del SII (500ms)
    await new Promise(r => setTimeout(r, 500));

    // Retorna un objeto simulado de SII
    return NextResponse.json({
      success: true,
      folio: Math.floor(Math.random() * 50000) + 10000,
      timestamp: new Date().toISOString(),
      xml_url: "https://mock-sii.cl/dte/xml/test.xml",
      message: "Boleta Electrónica generada exitosamente vía SimpleAPI"
    });

  } catch (error) {
    console.error('Error generando Boleta SII:', error);
    return NextResponse.json(
      { error: 'Error del Facturador Electrónico' },
      { status: 500 }
    );
  }
}
