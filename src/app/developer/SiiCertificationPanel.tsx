'use client'

import { useState } from 'react'
import { ShieldCheck, Play, CheckCircle2, XCircle, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runSiiCertificationAction, toggleSiiEnvironmentAction } from './actions/sii'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface CertificationResult {
  desc: string
  success: boolean
  folio?: number
  documentId?: string
  trackId?: string | null
  error?: string
}

export default function SiiCertificationPanel({ storeId, currentEnv }: { storeId: string, currentEnv: 'certification' | 'production' }) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<CertificationResult[] | null>(null)
  const [realMode, setRealMode] = useState(false)

  const runSuite = async () => {
    if (realMode && currentEnv === 'production') {
      const confirm = window.confirm('ATENCION: Está por ejecutar pruebas REALES en ambiente de PRODUCCIÓN. ¿Desea continuar?')
      if (!confirm) return
    }

    setIsRunning(true)
    setResults(null)
    try {
      const res = await runSiiCertificationAction(storeId, realMode)
      if (res.success && res.results) {
        setResults(res.results)
        toast.success('Suite de certificación completada')
      } else {
        toast.error('Error al ejecutar suite: ' + (res.error || 'Sin resultados'))
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setIsRunning(false)
    }
  }

  const toggleEnv = async () => {
    const nextEnv = currentEnv === 'certification' ? 'production' : 'certification'
    const confirm = window.confirm(`¿Desea cambiar el ambiente a ${nextEnv.toUpperCase()}?`)
    if (!confirm) return

    const res = await toggleSiiEnvironmentAction(storeId, nextEnv)
    if (res.success) {
      toast.success(`Ambiente cambiado a ${nextEnv.toUpperCase()}`)
    } else {
      toast.error('Error al cambiar ambiente')
    }
  }

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="bg-black/60 border border-white/5 p-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={cn(
            "px-4 py-1 text-[10px] font-black uppercase tracking-widest border",
            currentEnv === 'production' ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-amber-500/20 border-amber-500/40 text-amber-400"
          )}>
            Environment: {currentEnv}
          </div>
          <div className="flex items-center space-x-3">
            <Switch 
              id="real-mode" 
              checked={realMode} 
              onCheckedChange={setRealMode}
              className="data-[state=checked]:bg-amber-500"
            />
            <Label htmlFor="real-mode" className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer">
              {realMode ? 'Real Mode Active (SII Connect)' : 'Simulation Mode'}
            </Label>
          </div>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={toggleEnv}
          className="border-white/10 hover:border-white/20 text-gray-400 font-bold uppercase tracking-widest text-[9px] rounded-none"
        >
          Switch to {currentEnv === 'certification' ? 'Production' : 'Certification'}
        </Button>
      </div>

      <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-8 rounded-none">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-500/10 rounded-none border border-amber-500/20">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
              SII Certification Suite <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 font-black">STABLE v1.2</span>
            </h3>
            <p className="text-xs text-gray-500 font-bold mt-1">Validador de cumplimiento tributario para emisión electrónica (Chile).</p>
          </div>
        </div>
        <Button 
          onClick={runSuite} 
          disabled={isRunning}
          className="bg-amber-600 hover:bg-amber-500 text-white h-14 px-10 rounded-none font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(245,158,11,0.2)] group"
        >
          {isRunning ? (
            <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
          ) : (
            <Play className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
          )}
          {isRunning ? 'Executing Tests...' : 'Run Certification Suite'}
        </Button>
      </div>

      {results && (
        <div className="grid gap-4">
          {results.map((test, i) => (
            <div 
              key={i} 
              className={cn(
                "group flex items-center justify-between p-6 border transition-all duration-300",
                test.success 
                  ? "bg-black/40 border-amber-500/20 hover:border-amber-500/40" 
                  : "bg-red-500/5 border-red-500/20"
              )}
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center font-black text-xs border",
                  test.success ? "border-amber-500/40 text-amber-400" : "border-red-500/40 text-red-400"
                )}>
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-3">
                    {test.desc}
                    {test.success ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Folio: <span className="text-white">{test.folio || 'N/A'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      TrackID: <span className="text-white">{test.trackId || 'SIM-999999'}</span>
                    </span>
                    {test.documentId && (
                      <span className="text-[10px] font-bold text-amber-500/60 font-mono">
                        ID: {test.documentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {test.success && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-none font-bold uppercase tracking-widest text-[9px] border border-white/5"
                    onClick={() => window.open(`/api/sii/documentos/${test.documentId}/xml`, '_blank')}
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    View XML
                  </Button>
                )}
                {!test.success && (
                  <p className="text-[10px] text-red-400 font-bold uppercase">{test.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && !isRunning && (
        <div className="py-32 text-center border-2 border-dashed border-white/5 opacity-40">
          <ShieldCheck className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Waiting for suite execution command...</p>
        </div>
      )}
    </div>
  )
}
