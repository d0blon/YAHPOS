import { SiiConfig } from './types';
import iconv from 'iconv-lite';

export function generateEnvioXml(dtes: string[], config: SiiConfig, rutEnvia: string): string {
  const tmst = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const idSet = `SET_${Math.floor(Date.now() / 1000)}`;

  const dteElements = dtes.map(dte => dte.replace('<?xml version="1.0" encoding="ISO-8859-1"?>', '')).join('\n');

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioBOLETA xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioBOLETA_v11.xsd" version="1.0">
    <SetDTE ID="${idSet}">
        <Caratula version="1.0">
            <RutEmisor>${config.rutEmisor}</RutEmisor>
            <RutEnvia>${rutEnvia}</RutEnvia>
            <RutReceptor>66666666-6</RutReceptor>
            <FchResol>${config.fchResol || '2014-08-22'}</FchResol>
            <NroResol>${config.nroResol || '0'}</NroResol>
            <TmstFirmaEnv>${tmst}</TmstFirmaEnv>
        ${Array.from(dtes.reduce((acc, dte) => {
          const tipo = dte.match(/<TipoDTE>(\d+)<\/TipoDTE>/)?.[1] || '39';
          acc.set(tipo, (acc.get(tipo) || 0) + 1);
          return acc;
        }, new Map<string, number>()).entries()).map(([tipo, count]) => `
        <SubTotDTE>
            <TpoDTE>${tipo}</TpoDTE>
            <NroDTE>${count}</NroDTE>
        </SubTotDTE>`).join('')}
        </Caratula>
        ${dteElements}
    </SetDTE>
</EnvioBOLETA>`.trim();
}

/**
 * Envía el XML firmado al SII
 */
export async function enviarAlSII(xml: string, fileName: string, token: string, environment: 'certification' | 'production' = 'certification') {
  const url = environment === 'certification' 
    ? 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload' 
    : 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload';

  // El SII requiere que el envío sea multipart/form-data
  const body = new FormData();
  body.append('rut_emisor', xml.match(/<RutEmisor>(.*)<\/RutEmisor>/)?.[1]?.split('-')[0] || '');
  body.append('rut_digito', xml.match(/<RutEmisor>(.*)<\/RutEmisor>/)?.[1]?.split('-')[1] || '');
  
  // Convertir XML a ISO-8859-1 antes de enviar
  const xmlBuffer = iconv.encode(xml, 'ISO-8859-1');
  body.append('archivo', new Blob([new Uint8Array(xmlBuffer)], { type: 'application/xml' }), fileName);

  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: {
      'Cookie': `TOKEN=${token}`,
      'User-Agent': 'Mozilla/4.0 (compatible; PROG 1.0; Windows NT)'
    }
  });

  const responseText = await response.text();
  
  // Parsear respuesta del SII para obtener el TrackID
  // <STATUS>0</STATUS><TRACKID>1234567890</TRACKID>
  const trackIdMatch = responseText.match(/<TRACKID>(.*)<\/TRACKID>/);
  const statusMatch = responseText.match(/<STATUS>(.*)<\/STATUS>/);

  if (trackIdMatch && trackIdMatch[1]) {
    return { success: true, trackId: trackIdMatch[1], raw: responseText };
  }

  return { success: false, error: responseText || 'Respuesta vacía del SII', status: statusMatch?.[1] };
}
