import { NextResponse } from 'next/server'
import dns from 'dns/promises'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }

  try {
    // En producción, buscaríamos un CNAME que apunte a nuestro dominio base
    // Por ejemplo: tienda.cliente.com CNAME proxy.australmarket.cl
    
    // Para propósitos de desarrollo/demo, aceptamos cualquier dominio si estamos en localhost
    // o verificamos el CNAME si tenemos un dominio base configurado.
    
    const targetHost = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'australmarket.cl'
    
    try {
      const records = await dns.resolveCname(domain)
      const isValid = records.some(record => record.includes(targetHost))
      
      return NextResponse.json({ 
        valid: isValid,
        records: records,
        target: targetHost
      })
    } catch (dnsError) {
      // Si no hay CNAME, probamos con registros A (opcional)
      return NextResponse.json({ 
        valid: false, 
        error: 'No se encontró el registro CNAME apuntando a ' + targetHost 
      })
    }
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
  }
}
