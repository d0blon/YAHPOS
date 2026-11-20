/**
 * Respuesta de recepción del SII y control de reenvío.
 *
 * `DTEUpload` responde un XML corto:
 *   <RECEPCIONDTE><STATUS>0</STATUS><TRACKID>1234567890</TRACKID></RECEPCIONDTE>
 * y cuando rechaza:
 *   <RECEPCIONDTE><STATUS>7</STATUS><GLOSA>Error de firma</GLOSA></RECEPCIONDTE>
 *
 * El envío NO queda aceptado por recibir un track id: `STATUS` distinto de 0 es rechazo.
 * Confundir ambos casos deja DTEs marcados como enviados que el SII nunca aceptó.
 */

export interface RespuestaRecepcion {
  success: boolean;
  trackId?: string;
  status?: string;
  glosa?: string;
  error?: string;
  raw: string;
}

/** Respuesta HTTP que no es XML del SII (portal caído, login, proxy). */
const MAX_ERROR = 300;

function limpiar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim().slice(0, MAX_ERROR);
}

export function parsearRespuestaRecepcion(responseText: string): RespuestaRecepcion {
  const raw = responseText ?? '';
  const status = raw.match(/<STATUS>\s*([^<\s]+)\s*<\/STATUS>/i)?.[1];
  const trackId = raw.match(/<TRACKID>\s*([^<\s]+)\s*<\/TRACKID>/i)?.[1];
  const glosa = raw.match(/<GLOSA>\s*([^<]*?)\s*<\/GLOSA>/i)?.[1];

  if (status === '0' && trackId) {
    return { success: true, trackId, status, glosa, raw };
  }

  // Rechazo explícito del SII.
  if (status !== undefined) {
    const sinTrack = status === '0' && !trackId;
    return {
      success: false,
      status,
      trackId,
      glosa,
      error: sinTrack
        ? 'SII respondió STATUS 0 sin TRACKID: no se puede confirmar la recepción'
        : glosa
          ? `SII STATUS ${status}: ${glosa}`
          : `SII STATUS ${status}`,
      raw,
    };
  }

  // Sin <STATUS>: no es una respuesta del SII. No se puede interpretar como éxito.
  return {
    success: false,
    error: raw.trim() === '' ? 'Respuesta vacía del SII' : `Respuesta no reconocida del SII: ${limpiar(raw)}`,
    raw,
  };
}

/**
 * Un DTE con track id ya fue recibido por el SII. Reenviarlo produce "documento ya
 * ingresado" y ensucia el historial, así que el motor corta antes de firmar el sobre.
 */
export function yaFueRecibido(documento: { track_id?: string | null; estado_sii?: string | null }): boolean {
  if (documento.track_id && documento.track_id.trim() !== '') return true;
  return documento.estado_sii === 'ENVIADO' || documento.estado_sii === 'ACEPTADO';
}
