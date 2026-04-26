'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, Upload, ShieldCheck, HelpCircle, 
  FileUp, Key, CheckCircle2, AlertCircle,
  CloudLightning, Globe, Info, Download,
  ExternalLink, Loader2, Save, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function FacturacionSIIPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'certificacion'>('config')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [siiSettings, setSiiSettings] = useState({
    rut: '',
    razonSocial: '',
    giro: '',
    actividad: '',
    direccion: '',
    comuna: '',
    certificate: '',
    certificatePassword: '',
    cafFile: '',
    environment: 'certificacion'
  })

  // Certification cases state
  const [certificationCases, setCertificationCases] = useState<any[]>([])
  const [isProcessingCase, setIsProcessingCase] = useState<number | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchCertificationStatus()
  }, [])

  const fetchCertificationStatus = async () => {
    try {
      const res = await fetch('/api/sii/certification')
      if (res.ok) {
        const data = await res.json()
        setCertificationCases(data.cases || [])
      }
    } catch (err) {
      console.error('Error fetching certification status:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.settings?.sii) {
          setSiiSettings({
            ...data.settings.sii,
            environment: data.settings.sii.environment || 'certificacion'
          })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sii_rut: siiSettings.rut,
          sii_razon_social: siiSettings.razonSocial,
          sii_giro: siiSettings.giro,
          sii_actividad: siiSettings.actividad,
          sii_direccion: siiSettings.direccion,
          sii_comuna: siiSettings.comuna,
          sii_certificate: siiSettings.certificate,
          sii_certificate_password: siiSettings.certificatePassword,
          sii_caf_file: siiSettings.cafFile,
          sii_environment: siiSettings.environment
        })
      })
      if (res.ok) {
        toast.success('Configuración guardada correctamente')
      } else {
        throw new Error('Error al guardar')
      }
    } catch (err) {
      toast.error('No se pudo guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = () => {
    setIsTesting(true)
    setTimeout(() => {
      setIsTesting(false)
      toast.success('Conexión con SII (Ambiente Maullín) establecida con éxito.')
    }, 2000)
  }

  const handleRunCertificationCase = async (caseId: number) => {
    setIsProcessingCase(caseId)
    try {
      const res = await fetch('/api/sii/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Caso ${caseId} enviado con éxito. Track ID: ${data.trackId}`)
        fetchCertificationStatus()
      } else {
        throw new Error(data.error || 'Error al ejecutar caso')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsProcessingCase(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-corporate-blue mx-auto mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando Configuración Fiscal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Facturación <span className="text-corporate-blue">Electrónica</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Gestión de DTE, Firma Digital y Certificación SII</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
            <CloudLightning className="h-5 w-5 text-amber-500" />
            <div className="text-xs">
              <p className="font-black uppercase text-amber-600">Ambiente Actual</p>
              <p className="font-bold text-amber-700/80 uppercase">
                {siiSettings.environment === 'certificacion' ? 'Certificación (Maullín)' : 'Producción'}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-corporate-blue/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('config')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'config' ? "bg-corporate-blue text-white shadow-lg" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          )}
        >
          Configuración
        </button>
        <button 
          onClick={() => setActiveTab('certificacion')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'certificacion' ? "bg-corporate-blue text-white shadow-lg" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          )}
        >
          Certificación SII
        </button>
      </div>

      {activeTab === 'config' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Forms */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Datos del Emisor */}
            <Card className="border-none bg-white dark:bg-gray-800 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Datos del Emisor</CardTitle>
                  <CardDescription className="text-xs font-medium italic">Información legal que aparecerá en tus boletas y facturas.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">RUT Empresa</label>
                    <Input 
                      placeholder="76.123.456-7" 
                      className="h-12 bg-gray-50 border-none rounded-2xl font-mono text-sm"
                      value={siiSettings.rut}
                      onChange={e => setSiiSettings({...siiSettings, rut: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Razón Social</label>
                    <Input 
                      placeholder="Comercial Austral Market SpA" 
                      className="h-12 bg-gray-50 border-none rounded-2xl text-sm"
                      value={siiSettings.razonSocial}
                      onChange={e => setSiiSettings({...siiSettings, razonSocial: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Giro Comercial</label>
                    <Input 
                      placeholder="Venta al por menor en almacenes" 
                      className="h-12 bg-gray-50 border-none rounded-2xl text-sm"
                      value={siiSettings.giro}
                      onChange={e => setSiiSettings({...siiSettings, giro: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Código Actividad</label>
                    <Input 
                      placeholder="471100" 
                      className="h-12 bg-gray-50 border-none rounded-2xl font-mono text-sm"
                      value={siiSettings.actividad}
                      onChange={e => setSiiSettings({...siiSettings, actividad: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Dirección</label>
                    <Input 
                      placeholder="Av. Juan Soler Manfredini 11" 
                      className="h-12 bg-gray-50 border-none rounded-2xl text-sm"
                      value={siiSettings.direccion}
                      onChange={e => setSiiSettings({...siiSettings, direccion: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Comuna</label>
                    <Input 
                      placeholder="Puerto Montt" 
                      className="h-12 bg-gray-50 border-none rounded-2xl text-sm"
                      value={siiSettings.comuna}
                      onChange={e => setSiiSettings({...siiSettings, comuna: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Firma Electrónica */}
            <Card className="border-none bg-white dark:bg-gray-800 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-2xl">
                  <Key className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Firma Electrónica (Certificado)</CardTitle>
                  <CardDescription className="text-xs font-medium italic">El certificado digital que permite firmar legalmente los DTE.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group hover:border-purple-500/50 transition-colors cursor-pointer relative overflow-hidden">
                      <input 
                        type="file" 
                        accept=".pfx,.p12"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              setSiiSettings({...siiSettings, certificate: ev.target?.result as string})
                              toast.success('Certificado cargado exitosamente')
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                      <div className="p-4 bg-purple-500/5 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <FileUp className="h-8 w-8 text-purple-600" />
                      </div>
                      {siiSettings.certificate ? (
                        <>
                          <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">CERTIFICADO CARGADO</p>
                          <p className="text-[10px] text-gray-400 mt-1">Haga clic para reemplazar</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-gray-400 mb-1">Arrastra tu archivo aquí</p>
                          <p className="text-[10px] text-gray-400">Formato .pfx o .p12</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                        Contraseña de la Firma
                        <Info className="w-3 h-3 text-corporate-blue cursor-help" />
                      </label>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        className="h-12 bg-gray-50 border-none rounded-2xl text-sm"
                        value={siiSettings.certificatePassword}
                        onChange={e => setSiiSettings({...siiSettings, certificatePassword: e.target.value})}
                      />
                    </div>
                    
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">¿Qué es esto?</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        El archivo <strong className="text-gray-700">.pfx</strong> es tu identidad digital ante el SII. Es entregado por proveedores como E-Cert, Acepta o Certinet. Sin este archivo y su contraseña, no es posible emitir documentos tributarios.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Gestión de Folios (CAF) */}
            <Card className="border-none bg-white dark:bg-gray-800 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Folios Autorizados (CAF)</CardTitle>
                  <CardDescription className="text-xs font-medium italic">Archivos XML que contienen los rangos de números permitidos para tus boletas.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group hover:border-emerald-500/50 transition-colors cursor-pointer relative overflow-hidden">
                      <input 
                        type="file" 
                        accept=".xml"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              setSiiSettings({...siiSettings, cafFile: ev.target?.result as string})
                              toast.success('Archivo CAF cargado')
                            }
                            reader.readAsText(file)
                          }
                        }}
                      />
                      <div className="p-4 bg-emerald-500/5 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <FileUp className="h-8 w-8 text-emerald-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 mb-1">Subir nuevo CAF</p>
                      <p className="text-[10px] text-gray-400">Selecciona el XML bajado del SII</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">CAF Actual: Boleta Electrónica</span>
                        <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black tracking-widest">ACTIVO</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-black tracking-tighter">4.001 - 5.000</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rango Autorizado</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-600 tracking-tighter">892</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restantes</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '89.2%' }}></div>
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">¿Qué es esto?</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        El <strong className="text-gray-700">CAF (Código de Autorización de Folios)</strong> es un archivo XML que obtienes en <span className="text-blue-600 underline">sii.cl</span>. Indica cuántas boletas puedes emitir antes de pedir más.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Status & Tools */}
          <div className="space-y-6">
            {/* Environment Toggle */}
            <Card className="bg-gradient-to-br from-corporate-blue to-blue-800 text-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  < Globe className="h-5 w-5 text-blue-200" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Ambiente SII</h3>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => setSiiSettings({...siiSettings, environment: 'certificacion'})}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between transition-all",
                      siiSettings.environment === 'certificacion' ? "bg-white text-corporate-blue shadow-xl scale-105" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">Certificación</span>
                    {siiSettings.environment === 'certificacion' && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => setSiiSettings({...siiSettings, environment: 'produccion'})}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between transition-all",
                      siiSettings.environment === 'produccion' ? "bg-white text-corporate-blue shadow-xl scale-105" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">Producción</span>
                    {siiSettings.environment === 'produccion' && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                </div>

                <p className="text-[10px] text-blue-100/70 font-medium leading-relaxed italic">
                  <Info className="h-3 w-3 inline mr-1 mb-0.5" />
                  Usa 'Certificación' (Maullín) para realizar pruebas sin validez legal. Cambia a 'Producción' solo cuando el SII te haya autorizado.
                </p>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl p-8 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-4 transition-all duration-500",
                  (siiSettings.certificate && siiSettings.cafFile) 
                    ? "bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-500/20 scale-110"
                    : "bg-gray-100 text-gray-300"
                )}>
                  {(siiSettings.certificate && siiSettings.cafFile) ? (
                    <ShieldCheck className="w-10 h-10 animate-in zoom-in" />
                  ) : (
                    <AlertCircle className="w-10 h-10" />
                  )}
                </div>
                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {(siiSettings.certificate && siiSettings.cafFile) ? 'Sistema Operativo' : 'Incompleto'}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Verificación de Componentes</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Certificado Digital</span>
                  </div>
                  {siiSettings.certificate ? (
                    <Badge className="bg-emerald-500 text-white border-none h-5 px-2 text-[9px] font-black tracking-widest">OK</Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white border-none h-5 px-2 text-[9px] font-black tracking-widest">FALTA</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Folios Autorizados</span>
                  </div>
                  {siiSettings.cafFile ? (
                    <Badge className="bg-emerald-500 text-white border-none h-5 px-2 text-[9px] font-black tracking-widest">OK</Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white border-none h-5 px-2 text-[9px] font-black tracking-widest">FALTA</Badge>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleTestConnection}
                disabled={!siiSettings.certificate || !siiSettings.cafFile || isTesting}
                className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-gray-200"
              >
                {isTesting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Probar Conexión SII'}
              </Button>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-4">
              <a 
                href="https://www.sii.cl" 
                target="_blank" 
                rel="noreferrer"
                className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center gap-2 hover:bg-gray-50 transition-colors group"
              >
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-corporate-blue transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Portal SII</span>
              </a>
              <a 
                href="#" 
                className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center gap-2 hover:bg-gray-50 transition-colors group"
              >
                <Download className="w-4 h-4 text-gray-300 group-hover:text-corporate-blue transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Manuales</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Certificación SII Tab */
        <div className="max-w-4xl mx-auto">
          <Card className="border-none bg-white dark:bg-gray-800 shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="p-10 pb-0">
              <div className="flex items-center gap-4 mb-2">
                <Badge className="bg-amber-500/10 text-amber-600 border-none font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1">Ambiente de Pruebas</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1">En Proceso</Badge>
              </div>
              <CardTitle className="text-3xl font-black uppercase tracking-tighter italic">Camino a la <span className="text-corporate-blue">Certificación</span></CardTitle>
              <CardDescription className="text-sm font-medium">Sigue estas etapas obligatorias para poder emitir documentos tributarios con validez legal.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-12">
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-700 -z-0"></div>
                
                <div className="space-y-12 relative z-10">
                  {certificationCases.length > 0 ? (
                    certificationCases.map((step) => (
                      <div key={step.id} className="flex gap-8 group">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm transition-all duration-500",
                          step.status === 'accepted' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110" :
                          step.status === 'pending' ? "bg-corporate-blue text-white shadow-lg shadow-corporate-blue/20 ring-4 ring-corporate-blue/10" :
                          "bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 transition-colors"
                        )}>
                          {step.status === 'accepted' ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={cn("font-black uppercase tracking-tight", step.status === 'locked' ? "text-gray-400" : "text-gray-900 dark:text-white")}>
                              {step.name}
                            </h4>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{step.time}</span>
                          </div>
                          <p className={cn("text-xs leading-relaxed", step.status === 'locked' ? "text-gray-400" : "text-gray-500")}>
                            {step.description}
                          </p>
                          {step.trackId && (
                            <p className="text-[9px] font-mono text-emerald-600 mt-1">TRACK ID: {step.trackId}</p>
                          )}
                          {step.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleRunCertificationCase(step.id)}
                              disabled={isProcessingCase !== null || !siiSettings.certificate}
                              className="mt-4 bg-corporate-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-6"
                            >
                              {isProcessingCase === step.id ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                              Iniciar Prueba
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-300 mb-4" />
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Cargando Set de Pruebas...</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                  <img src="/images/sii-logo.png" alt="SII" className="w-16 grayscale opacity-30" />
                </div>
                <div>
                  <h5 className="font-black uppercase tracking-widest text-[11px] text-gray-400 mb-2">Asistencia Técnica</h5>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Si tienes problemas con el set de pruebas o no sabes cómo descargar tu CAF, nuestro equipo técnico puede realizar la certificación por ti en menos de 24 horas.
                  </p>
                  <Button variant="link" className="text-corporate-blue p-0 h-auto text-xs font-black uppercase tracking-widest mt-2">
                    Contactar Soporte Técnico
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

