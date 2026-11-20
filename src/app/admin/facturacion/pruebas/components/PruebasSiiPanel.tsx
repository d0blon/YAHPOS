'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDteHistory } from '@/app/admin/facturacion/actions'
import { ejecutarCasoPrueba } from '../actions'
import { SII_TEST_CASES, type CasoPruebaSii } from '@/lib/sii/test-cases'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACK_RE = /^\d{1,20}$/
const TRACK_SIMULADO = '9999999999'
const MENSAJE_CUOTA = 'Cuota de 1 folio real usada en esta sesión'

interface DocumentoHistorial {
  id: string
  folio: number
  tipo_dte: number
  estado: string
}

interface VeredictoSii {
  veredicto: string
  estado: string
  fecha: string
}

interface ResultadoEnviado {
  casoId: string
  titulo: string
  folio: number
  documentId: string
  trackId: string
  estado: string
  veredictoSii: VeredictoSii | null
  errorConsulta: string | null
}

interface ResultadoParcial {
  casoId: string
  titulo: string
  folio: number
  documentId: string
  estado: string
  mensaje: string
}

interface EstadoCaso {
  cargando: boolean
  error: string | null
  enviado: ResultadoEnviado | null
  parcial: ResultadoParcial | null
}

function estadoInicial(): EstadoCaso {
  return { cargando: false, error: null, enviado: null, parcial: null }
}

function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Error inesperado'
}

async function verificarDocumento(documentId: string, folio: number, tipo: number): Promise<DocumentoHistorial | null> {
  const historial = await getDteHistory()
  if (!historial.success) throw new Error(historial.error)

  const doc = (historial.data ?? []).find((item) => item.id === documentId)
  if (!doc || Number(doc.folio) !== folio || Number(doc.tipo_dte) !== tipo) return null

  return {
    id: doc.id,
    folio: Number(doc.folio),
    tipo_dte: Number(doc.tipo_dte),
    estado: String(doc.estado ?? 'DESCONOCIDO'),
  }
}

/** La ruta existente es la única fuente del track ID; rechaza cualquier simulación. */
async function enviarAlSii(documentId: string): Promise<string> {
  const res = await fetch('/api/sii/enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ documentId }),
  })

  const texto = await res.text()
  if (/MOCK|SIMULAD|9999999999/i.test(texto)) {
    throw new Error('El motor devolvió un resultado simulado (track/MOCK): no se reporta éxito')
  }

  let data: unknown = null
  try {
    data = texto ? JSON.parse(texto) : null
  } catch {
    throw new Error(`Respuesta inválida del envío (HTTP ${res.status})`)
  }
  if (data == null || typeof data !== 'object') {
    throw new Error(`Respuesta inválida del envío (HTTP ${res.status})`)
  }

  const respuesta = data as { success?: unknown; trackId?: unknown; error?: unknown }
  if (!res.ok || respuesta.success !== true) {
    throw new Error(String(respuesta.error ?? `Error enviando al SII (HTTP ${res.status})`))
  }

  const trackId = respuesta.trackId
  if (typeof trackId !== 'string' || !TRACK_RE.test(trackId) || trackId === TRACK_SIMULADO) {
    throw new Error('Track ID inválido o simulado: no se reporta éxito')
  }

  return trackId
}

async function consultarVeredictoSii(documentId: string): Promise<VeredictoSii> {
  const res = await fetch(`/api/sii/estado/${encodeURIComponent(documentId)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })

  const texto = await res.text()
  let data: unknown = null
  try {
    data = texto ? JSON.parse(texto) : null
  } catch {
    throw new Error(`Respuesta inválida del SII (HTTP ${res.status})`)
  }
  if (data == null || typeof data !== 'object') {
    throw new Error(`Respuesta inválida del SII (HTTP ${res.status})`)
  }

  const respuesta = data as {
    success?: unknown
    veredicto?: unknown
    estado?: unknown
    fecha?: unknown
    error?: unknown
  }
  if (!res.ok || respuesta.success !== true) {
    throw new Error(String(respuesta.error ?? `Error consultando el SII (HTTP ${res.status})`))
  }
  if (typeof respuesta.veredicto !== 'string' || typeof respuesta.fecha !== 'string') {
    throw new Error('El SII no devolvió un veredicto verificable')
  }

  return {
    veredicto: respuesta.veredicto,
    estado: typeof respuesta.estado === 'string' ? respuesta.estado : '',
    fecha: respuesta.fecha,
  }
}

export function PruebasSiiPanel({ storeId }: { storeId: string }) {
  const [cafTipos, setCafTipos] = useState<number[] | null>(null)
  const [cafError, setCafError] = useState<string | null>(null)
  const [estados, setEstados] = useState<Record<string, EstadoCaso>>(() =>
    Object.fromEntries(SII_TEST_CASES.map((caso) => [caso.id, estadoInicial()])),
  )
  const prefijoCuota = `sii-pruebas-folio:${storeId || 'sin-tienda'}:`
  const [cuotaUsada, setCuotaUsada] = useState(false)
  const [cuotaCargando, setCuotaCargando] = useState(true)

  useEffect(() => {
    let activo = true
    const leerCuota = (): boolean => {
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const clave = window.sessionStorage.key(i)
          if (clave?.startsWith(prefijoCuota)) return true
        }
      } catch {
        return false
      }
      return false
    }

    Promise.resolve().then(() => {
      if (!activo) return
      setCuotaUsada(leerCuota())
      setCuotaCargando(false)
    })
    return () => { activo = false }
  }, [prefijoCuota])

  useEffect(() => {
    let activo = true
    const cargarCaf = async () => {
      try {
        const res = await fetch('/api/sii/caf', { credentials: 'same-origin', cache: 'no-store' })
        if (!res.ok) throw new Error(res.status === 403 ? 'sin permisos' : `HTTP ${res.status}`)
        const data: unknown = await res.json()
        const tipos = (data as { tipos_disponibles?: unknown } | null)?.tipos_disponibles
        if (!Array.isArray(tipos)) throw new Error('respuesta inválida')
        const normalizados = tipos
          .map((tipo) => Number(tipo))
          .filter((tipo) => Number.isInteger(tipo) && tipo > 0)
        if (activo) setCafTipos(normalizados)
      } catch (err) {
        if (activo) {
          setCafTipos([])
          setCafError(mensajeError(err))
        }
      }
    }
    void cargarCaf()
    return () => { activo = false }
  }, [])

  const actualizar = useCallback((id: string, cambio: Partial<EstadoCaso>) => {
    setEstados((previos) => ({ ...previos, [id]: { ...(previos[id] ?? estadoInicial()), ...cambio } }))
  }, [])

  const marcarCuota = useCallback((tipo: number) => {
    try {
      window.sessionStorage.setItem(`${prefijoCuota}${tipo}`, String(Date.now()))
    } catch {
      // Navegador sin sessionStorage: la cuota sigue activa en memoria de la página.
    }
    setCuotaUsada(true)
  }, [prefijoCuota])

  const reiniciarCuota = useCallback(() => {
    const confirmado = window.confirm(
      'Esto permite emitir otro DTE real y consumir 1 folio más. ¿Reiniciar la cuota?',
    )
    if (!confirmado) return

    try {
      for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
        const clave = window.sessionStorage.key(i)
        if (clave?.startsWith(prefijoCuota)) window.sessionStorage.removeItem(clave)
      }
    } catch {
      // Navegador sin sessionStorage: solo se reinicia el estado en memoria.
    }
    setCuotaUsada(false)
  }, [prefijoCuota])

  const ejecutar = useCallback(async (caso: CasoPruebaSii) => {
    const confirmado = window.confirm(
      `Esto consume 1 folio real y envía al SII.\nCaso: ${caso.titulo} (tipo ${caso.tipo}).\n¿Desea continuar?`,
    )
    if (!confirmado) return
    if (cuotaUsada) {
      actualizar(caso.id, { error: MENSAJE_CUOTA })
      return
    }

    actualizar(caso.id, { cargando: true, error: null, enviado: null, parcial: null })
    try {
      const emitido = await ejecutarCasoPrueba(caso.id)
      if (!emitido.success) throw new Error(emitido.error)
      if (!UUID_RE.test(emitido.documentId) || !Number.isInteger(emitido.folio) || emitido.folio <= 0) {
        throw new Error('El motor devolvió un documento inválido; no se enviará')
      }

      // El folio ya está consumido: la cuota se marca antes de intentar el envío.
      marcarCuota(caso.tipo)

      let docAntes: DocumentoHistorial | null
      try {
        docAntes = await verificarDocumento(emitido.documentId, emitido.folio, caso.tipo)
      } catch (err) {
        actualizar(caso.id, {
          cargando: false,
          parcial: {
            casoId: caso.id,
            titulo: caso.titulo,
            folio: emitido.folio,
            documentId: emitido.documentId,
            estado: 'NO VERIFICADO',
            mensaje: `Firmado, pero no se pudo verificar la tienda del documento: ${mensajeError(err)}`,
          },
        })
        return
      }
      if (!docAntes) throw new Error('Documento no encontrado en la tienda; no se enviará')

      let trackId: string
      try {
        trackId = await enviarAlSii(emitido.documentId)
      } catch (err) {
        let estadoReal = docAntes.estado
        try {
          estadoReal = (await verificarDocumento(emitido.documentId, emitido.folio, caso.tipo))?.estado ?? estadoReal
        } catch {
          // Se conserva el último estado conocido; nunca se inventa uno.
        }
        actualizar(caso.id, {
          cargando: false,
          parcial: {
            casoId: caso.id,
            titulo: caso.titulo,
            folio: emitido.folio,
            documentId: emitido.documentId,
            estado: estadoReal,
            mensaje: mensajeError(err),
          },
        })
        return
      }

      const docDespues = await verificarDocumento(emitido.documentId, emitido.folio, caso.tipo)
      if (!docDespues) {
        throw new Error('Documento no encontrado en la tienda tras el envío; no se muestra track ID')
      }

      actualizar(caso.id, {
        cargando: false,
        enviado: {
          casoId: caso.id,
          titulo: caso.titulo,
          folio: emitido.folio,
          documentId: emitido.documentId,
          trackId,
          estado: docDespues.estado,
          veredictoSii: null,
          errorConsulta: null,
        },
      })
    } catch (err) {
      actualizar(caso.id, { cargando: false, error: mensajeError(err) })
    }
  }, [actualizar, cuotaUsada, marcarCuota])

  const recargarEstado = useCallback(async (caso: CasoPruebaSii, enviado: ResultadoEnviado) => {
    try {
      const doc = await verificarDocumento(enviado.documentId, enviado.folio, caso.tipo)
      if (!doc) throw new Error('Documento no encontrado en la tienda')
      actualizar(caso.id, { enviado: { ...enviado, estado: doc.estado } })
    } catch (err) {
      actualizar(caso.id, { error: `No se pudo refrescar el estado: ${mensajeError(err)}` })
    }
  }, [actualizar])

  const consultarEstadoSii = useCallback(async (caso: CasoPruebaSii, enviado: ResultadoEnviado) => {
    try {
      const veredictoSii = await consultarVeredictoSii(enviado.documentId)
      actualizar(caso.id, { enviado: { ...enviado, veredictoSii, errorConsulta: null } })
    } catch (err) {
      actualizar(caso.id, { enviado: { ...enviado, errorConsulta: mensajeError(err) } })
    }
  }, [actualizar])

  const hayEjecucion = Object.values(estados).some((estado) => estado.cargando)
  const cafCargando = cafTipos === null && !cafError
  const cafDisponibles = cafTipos ?? []

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <Link href="/admin/facturacion" className="hover:underline">Facturación</Link>
          <span>/</span>
          <span>Set de pruebas SII</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Set de pruebas SII</h1>
        <p className="text-gray-400">
          Emisión real con el certificado y el CAF de la tienda. Cada ejecución consume 1 folio.
        </p>
      </div>

      <Card className="border-none bg-white dark:bg-gray-800 shadow-2xl rounded-[2.5rem]">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <FileText className="h-5 w-5 text-amber-600" />
            Estado del CAF
          </CardTitle>
          <CardDescription className="text-xs font-medium italic">
            Los tipos se leen de <code>/api/sii/caf</code> y se reverifican en servidor antes de emitir.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          {cafCargando ? (
            <p className="text-sm text-gray-500">Consultando CAF vigente…</p>
          ) : cafError || cafDisponibles.length === 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Sin CAF consultable{cafError ? ` (${cafError})` : ''}. Ningún caso puede ejecutarse.
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              CAF vigente para tipos: {cafDisponibles.join(', ')}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {[39, 41, 33, 52, 56, 61].map((tipo) => (
              <span
                key={tipo}
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                  cafDisponibles.includes(tipo)
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-500/10 text-gray-500'
                }`}
              >
                Tipo {tipo}: {cafDisponibles.includes(tipo) ? 'CAF vigente' : 'CAF pendiente'}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-400">
            Los casos con CAF pendiente de verificación SII no se pueden ejecutar.
            {' '}Cada botón firma y envía un DTE real: consume 1 folio. El dueño autorizó una boleta tipo 39;
            ejecute solo el caso necesario.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-primary/20 bg-brand-primary/10 p-4 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>
              {cuotaCargando
                ? 'Verificando cuota de folios de esta sesión…'
                : cuotaUsada
                  ? MENSAJE_CUOTA
                  : 'Cuota disponible: 1 folio real en esta sesión.'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={cuotaCargando || !cuotaUsada}
              onClick={reiniciarCuota}
            >
              Reiniciar cuota
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {SII_TEST_CASES.map((caso) => {
          const estado = estados[caso.id] ?? estadoInicial()
          const bloqueado = cafCargando || !cafDisponibles.includes(caso.requiresCaf)
          const docId = estado.enviado?.documentId ?? estado.parcial?.documentId

          return (
            <Card key={caso.id} className="border-none bg-white dark:bg-gray-800 shadow-xl rounded-3xl">
              <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-primary">
                      Tipo {caso.tipo}
                    </span>
                    {bloqueado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <Lock className="h-3 w-3" /> Bloqueado · requiere CAF {caso.requiresCaf}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        Habilitado
                      </span>
                    )}
                    {cuotaUsada && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-400">
                        <Lock className="h-3 w-3" /> {MENSAJE_CUOTA}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{caso.titulo}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-300">{caso.descripcion}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Consume 1 folio · Envío real · ID {caso.id}
                  </p>

                  {estado.error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{estado.error}</span>
                    </div>
                  )}

                  {estado.parcial && (
                    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                      <p className="font-bold">DTE firmado, envío no confirmado</p>
                      <p>{estado.parcial.mensaje}</p>
                      <p className="font-mono text-xs">
                        Folio {estado.parcial.folio} · documentId {estado.parcial.documentId} · estado {estado.parcial.estado}
                      </p>
                    </div>
                  )}

                  {estado.enviado && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                      <p className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Enviado al SII
                      </p>
                      <p className="font-mono text-xs">
                        Folio {estado.enviado.folio} · documentId {estado.enviado.documentId}
                      </p>
                      <p className="font-mono text-xs">Track ID {estado.enviado.trackId}</p>
                      <p className="text-xs">Estado local en BD: {estado.enviado.estado}</p>
                      {estado.enviado.veredictoSii && (
                        <div className="space-y-1 rounded-lg bg-white/50 p-2 text-xs dark:bg-black/20">
                          <p className="font-bold">Veredicto real del SII: {estado.enviado.veredictoSii.veredicto}</p>
                          <p>Estado en BD tras la consulta: {estado.enviado.veredictoSii.estado || '—'}</p>
                          <p>Fecha de consulta: {estado.enviado.veredictoSii.fecha}</p>
                        </div>
                      )}
                      {estado.enviado.errorConsulta && (
                        <p className="text-xs text-red-700 dark:text-red-400">
                          No se pudo consultar el SII: {estado.enviado.errorConsulta}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => void recargarEstado(caso, estado.enviado!)}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" /> Refrescar estado local
                        </button>
                        <button
                          type="button"
                          onClick={() => void consultarEstadoSii(caso, estado.enviado!)}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Consultar estado SII
                        </button>
                        <a
                          href={`/api/sii/documentos/${estado.enviado.documentId}/xml`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> XML
                        </a>
                        <a
                          href={`/api/sii/documentos/${estado.enviado.documentId}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> PDF
                        </a>
                      </div>
                    </div>
                  )}

                  {docId && estado.parcial && (
                    <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-500">
                      <a href={`/api/sii/documentos/${docId}/xml`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Ver XML del DTE firmado
                      </a>
                      <a href={`/api/sii/documentos/${docId}/pdf`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Ver PDF del DTE firmado
                      </a>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={bloqueado || estado.cargando || hayEjecucion || cuotaCargando || cuotaUsada}
                  onClick={() => void ejecutar(caso)}
                  title={
                    cuotaUsada
                      ? MENSAJE_CUOTA
                      : bloqueado
                        ? `Requiere CAF vigente de tipo ${caso.requiresCaf}`
                        : 'Firma y envía un DTE real'
                  }
                  className="flex-shrink-0"
                >
                  {estado.cargando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Ejecutar caso
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
