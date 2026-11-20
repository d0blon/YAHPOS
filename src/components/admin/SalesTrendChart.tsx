'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { SectionCard } from '@/components/admin/SectionCard'
import { CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Granularity = 'week' | 'month' | 'year' | 'custom'

interface Bucket { label: string; pos: number; ecom: number }
interface Tick { at: number; text: string; current?: boolean }
interface SeriesData { buckets: Bucket[]; ticks: Tick[]; total: number }

const PLOT_H = 264, PAD_Y = 11, PAD_X = 10, GAP = 2, FIXED_ROWS = 18

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
/** Etiqueta del eje Y sin abreviaciones tipo "k". Montos completos en formato chileno; sobre
 *  el millón usa "mill." escrito, que se entiende sin conocer convenciones. */
const axisFmt = (n: number) => {
  if (n >= 1_000_000) {
    const millones = n / 1_000_000
    return `${millones.toLocaleString('es-CL', { maximumFractionDigits: 1 })} mill.`
  }
  return Math.round(n).toLocaleString('es-CL')
}
const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function niceMax(v: number) {
  if (v <= 0) return 10000
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
function rgbOf(h: string) {
  const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]
}
function mixArr(c1: string, c2: string, t: number) {
  const a = rgbOf(c1), b = rgbOf(c2)
  return a.map((v, i) => v + (b[i] - v) * t)
}
/** POS = rampa indigo de marca, E-commerce = rampa magenta. Atenuación global por altura. */
function sqColor(i: number, posN: number, totalN: number) {
  const c = i < posN
    ? mixArr('#a259ff', '#6a1fb0', posN > 1 ? i / (posN - 1) : 0)
    : mixArr('#ff00ff', '#c400c0', (totalN - posN) > 1 ? (i - posN) / (totalN - posN - 1) : 0)
  const dim = 1 - 0.28 * (totalN > 1 ? i / (totalN - 1) : 0)
  return `rgb(${c.map(v => Math.round(v * dim)).join(',')})`
}

const VIEWS: { v: Granularity; label: string }[] = [
  { v: 'week', label: 'Semanal' },
  { v: 'month', label: 'Mensual' },
  { v: 'year', label: 'Anual' },
  { v: 'custom', label: 'Personalizado' },
]

export function SalesTrendChart({ branchId = 'all' }: { branchId?: string }) {
  const [view, setView] = useState<Granularity>('month')
  const [data, setData] = useState<SeriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPos, setShowPos] = useState(true)
  const [showEcom, setShowEcom] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [trackW, setTrackW] = useState(0)
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [calAnchor, setCalAnchor] = useState(() => new Date())
  const [customApplied, setCustomApplied] = useState(false)

  useLayoutEffect(() => {
    const el = plotRef.current
    if (!el) return
    const update = () => setTrackW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, error, view, customApplied])

  const load = useCallback(async (g: Granularity, range?: { from: string; to: string }) => {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/dashboard/series', window.location.origin)
      url.searchParams.set('granularity', g)
      if (branchId !== 'all') url.searchParams.set('branchId', branchId)
      if (g === 'custom' && range) {
        url.searchParams.set('from', range.from)
        url.searchParams.set('to', range.to)
      }
      const res = await fetch(url.toString())
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudieron cargar las ventas')
      }
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las ventas')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    if (view === 'custom') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón sin cambio de comportamiento
    load(view)
  }, [view, load])

  const buckets = useMemo(() => data?.buckets ?? [], [data])
  const val = useCallback(
    (b: Bucket) => (showPos ? b.pos : 0) + (showEcom ? b.ecom : 0),
    [showPos, showEcom]
  )
  const total = buckets.reduce((a, b) => a + val(b), 0)

  const n = Math.max(buckets.length, 1)
  const rows = FIXED_ROWS
  // El cuadrado se dimensiona SOLO por el ancho disponible, así el gap horizontal es
  // exactamente GAP (igual que el vertical). El alto del gráfico se deriva de ahí.
  const slot = trackW > 0 ? (trackW - PAD_X * 2) / n : 0
  const sq = Math.max(4, Math.floor(slot - GAP))
  const pitch = sq + GAP                       // distancia entre inicios de columna/fila
  const gridW = n * pitch - GAP                // ancho real que ocupa la grilla dibujada
  const offsetX = Math.max(PAD_X, (trackW - gridW) / 2)  // centrada: mismo margen a ambos lados
  const plotH = PAD_Y * 2 + rows * sq + (rows - 1) * GAP  // alto derivado, ya no es constante
  const top = niceMax(Math.max(...buckets.map(val), 1) * 1.12)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || trackW === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(trackW * dpr)
    canvas.height = Math.round(plotH * dpr)
    canvas.style.width = trackW + 'px'
    canvas.style.height = plotH + 'px'
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, trackW, plotH)

    buckets.forEach((b, i) => {
      const v = val(b)
      const filled = v > 0 ? Math.max(1, Math.round((v / top) * rows)) : 0
      const share = (b.pos + b.ecom) > 0 ? b.pos / (b.pos + b.ecom) : 0
      const posN = showPos && showEcom ? Math.round(filled * share) : (showPos ? filled : 0)
      const colX = offsetX + i * pitch

      if (hover === i) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(offsetX + i * pitch - GAP / 2, 0, pitch, plotH)
      }

      for (let r = 0; r < rows; r++) {
        const yTop = plotH - PAD_Y - (r + 1) * sq - r * GAP
        ctx.fillStyle = r < filled ? sqColor(r, posN, filled) : 'hsl(0,0%,16%)'
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath()
          ctx.roundRect(colX, yTop, sq, sq, 1.5)
          ctx.fill()
        } else {
          ctx.fillRect(colX, yTop, sq, sq)
        }
      }
    })
  }, [buckets, val, trackW, showPos, showEcom, hover, rows, sq, top, plotH, pitch, offsetX])

  const Y_TICKS = 7
  const rowsPerTick = rows / (Y_TICKS - 1)   // 18 filas / 6 intervalos = 3 filas por marca
  // Ascendente: yTicks[0] = 0 (abajo), yTicks[6] = top (arriba)
  const yTicks: string[] = []
  for (let i = 0; i < Y_TICKS; i++) yTicks.push(axisFmt(top * i / (Y_TICKS - 1)))

  const active = hover
  const activeBucket = active !== null ? buckets[active] : undefined

  const pickDay = (d: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(d); setRangeEnd(null)
    } else if (d < rangeStart) {
      setRangeEnd(rangeStart); setRangeStart(d)
    } else {
      setRangeEnd(d)
    }
  }
  const applyRange = () => {
    if (!rangeStart || !rangeEnd) return
    load('custom', { from: fmtISO(rangeStart), to: fmtISO(rangeEnd) })
    setCustomApplied(true)
  }

  return (
    <SectionCard>
      <CardContent className="p-5">
        {/* Cabecera */}
        <div className="flex items-center gap-4 flex-wrap mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-[var(--muted-foreground)]">Total del período</span>
            <span className="text-xl font-semibold tabular-nums">{money(total)}</span>
          </div>

          <div className="flex gap-4 ml-auto mr-auto">
            <button
              onClick={() => showEcom && setShowPos(v => !v)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] transition-opacity",
                !showPos && "opacity-35"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a259ff' }} />
              POS
            </button>
            <button
              onClick={() => showPos && setShowEcom(v => !v)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] transition-opacity",
                !showEcom && "opacity-35"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff00ff' }} />
              E-commerce
            </button>
          </div>

          <div className="flex gap-0.5 p-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)]">
            {VIEWS.map(o => (
              <button
                key={o.v}
                onClick={() => {
                  setView(o.v)
                  if (o.v === 'custom') {
                    setCustomApplied(false)
                    setRangeStart(null)
                    setRangeEnd(null)
                  }
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs transition-colors",
                  view === o.v
                    ? "bg-[var(--border)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {view === 'custom' && !customApplied ? (
            <div className="flex flex-wrap gap-6 items-start py-2">
              <div className="w-[248px] shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setCalAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    className="w-6 h-6 rounded-md bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-xs"
                  >‹</button>
                  <span className="text-xs font-medium">
                    {calAnchor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCalAnchor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    className="w-6 h-6 rounded-md bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] text-xs"
                  >›</button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                    <div key={d} className="text-center text-[9px] text-[var(--muted-foreground)]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {(() => {
                    const y = calAnchor.getFullYear(), m = calAnchor.getMonth()
                    const days = new Date(y, m + 1, 0).getDate()
                    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
                    const cells = []
                    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />)
                    for (let d = 1; d <= days; d++) {
                      const date = new Date(y, m, d)
                      const isEdge = sameDay(date, rangeStart) || sameDay(date, rangeEnd)
                      const isMid = !!rangeStart && !!rangeEnd && date > rangeStart && date < rangeEnd
                      cells.push(
                        <button
                          key={d}
                          onClick={() => pickDay(date)}
                          className={cn(
                            "aspect-square rounded-md text-[10px]",
                            isEdge ? "bg-[var(--brand-accent,#ff00ff)] text-white font-semibold"
                              : isMid ? "bg-[var(--brand-accent,#ff00ff)]/15 text-[var(--foreground)]"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                          )}
                        >{d}</button>
                      )
                    }
                    return cells
                  })()}
                </div>
              </div>
              <div className="flex-1 min-w-[180px] flex flex-col gap-2">
                <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Desde</span><span>{rangeStart ? fmtISO(rangeStart) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Hasta</span><span>{rangeEnd ? fmtISO(rangeEnd) : '—'}</span></div>
                </div>
                <button
                  onClick={applyRange}
                  disabled={!rangeStart || !rangeEnd}
                  className="self-start px-3.5 py-2 rounded-lg text-xs font-semibold bg-brand-accent text-white disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  Aplicar rango
                </button>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  Clic en un día para el inicio, otro clic para el fin.
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center text-sm text-[var(--muted-foreground)]" style={{ height: PLOT_H }}>
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center" style={{ height: PLOT_H }}>
              <Loader2 className="w-5 h-5 animate-spin text-brand-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {view === 'custom' && (
                <button onClick={() => setCustomApplied(false)} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2 underline">
                  ‹ Cambiar rango
                </button>
              )}
              <div className="grid" style={{ gridTemplateColumns: '64px 1fr', minWidth: 360 }}>
              {/* Eje Y */}
              <div className="relative" style={{ height: plotH }}>
                {yTicks.map((t, i) => {
                  // Distancia desde el borde inferior de la grilla hasta el borde superior de la fila
                  // (i * rowsPerTick - 1). La marca 0 va justo en el piso de la grilla.
                  const fromBottom = i === 0 ? 0 : i * rowsPerTick * (sq + GAP) - GAP
                  return (
                    <div
                      key={i}
                      className="absolute right-0 flex items-center justify-end gap-1.5 text-[10.5px] text-[var(--muted-foreground)] tabular-nums"
                      style={{ top: plotH - PAD_Y - fromBottom, transform: 'translateY(-50%)' }}
                    >
                      {t}<i className="block w-[5px] h-px bg-[var(--border)]" />
                    </div>
                  )
                })}
              </div>

              {/* Área del gráfico */}
              <div
                ref={plotRef}
                className="relative rounded-lg overflow-hidden bg-[var(--muted)]"
                style={{ height: plotH }}
                onMouseLeave={() => setHover(null)}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0"
                  style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const idx = Math.max(0, Math.min(buckets.length - 1, Math.floor((x - offsetX) / pitch)))
                    setHover(idx)
                  }}
                />

                {/* Cursor + tooltip */}
                {activeBucket && (() => {
                  const x = offsetX + (active! + 0.5) * pitch - GAP / 2
                  const topPx = plotH * 0.42
                  const tipW = 190
                  const flip = x + 14 + tipW > trackW - 6
                  return (
                    <>
                      <div
                        className="absolute top-0 bottom-0 w-px pointer-events-none"
                        style={{
                          left: x,
                          backgroundImage: 'repeating-linear-gradient(to bottom, hsl(0,0%,69%) 0 3px, transparent 3px 6px)',
                        }}
                      />
                      <div
                        className="absolute w-[11px] h-[11px] rounded-full border-[1.5px] pointer-events-none bg-[var(--muted)]"
                        style={{ left: x, top: topPx, transform: 'translate(-50%,-50%)', borderColor: 'var(--foreground)' }}
                      />
                      <div
                        className="absolute rounded-lg border border-[var(--border)] bg-[var(--card)] pointer-events-none z-10"
                        style={{ left: flip ? x - tipW - 14 : x + 14, top: topPx - 12, minWidth: 158 }}
                      >
                        <div className="text-[13px] px-3 pt-2 pb-1.5 border-b border-[var(--border)]">
                          {activeBucket.label}
                        </div>
                        <div className="px-3 pt-1.5 pb-2">
                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a259ff' }} />
                            POS
                            <b className="ml-auto pl-3 font-semibold text-[var(--foreground)] tabular-nums">{money(activeBucket.pos)}</b>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff00ff' }} />
                            E-commerce
                            <b className="ml-auto pl-3 font-semibold text-[var(--foreground)] tabular-nums">{money(activeBucket.ecom)}</b>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mt-1 pt-1.5 border-t border-[var(--border)]">
                            Total
                            <b className="ml-auto pl-3 font-semibold text-[var(--foreground)] tabular-nums">
                              {money(activeBucket.pos + activeBucket.ecom)}
                            </b>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Eje X */}
            <div className="relative h-[22px] mt-2" style={{ marginLeft: 64, minWidth: 360 }}>
              {(data?.ticks ?? []).map((t, i, arr) => {
                const x = offsetX + (t.at + 0.5) * pitch - GAP / 2
                const next = arr[i + 1]
                const dotX = next ? offsetX + ((t.at + next.at) / 2 + 0.5) * pitch - GAP / 2 : null
                return (
                  <React.Fragment key={i}>
                    <span
                      className={cn(
                        "absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10.5px] uppercase tracking-wider",
                        t.current ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                      )}
                      style={{ left: x }}
                    >
                      {t.text}
                    </span>
                    {dotX !== null && (
                      <i className="absolute top-0 -translate-x-1/2 not-italic text-[11px] text-[var(--border)]" style={{ left: dotX }}>
                        &middot;
                      </i>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
          )}
        </div>
      </CardContent>
    </SectionCard>
  )
}
