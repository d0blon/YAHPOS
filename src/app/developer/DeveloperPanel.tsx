'use client'

import { useState, useEffect, Fragment } from 'react'
import { 
  Zap, Crown, Star, LogOut, Save, Layout, Database,
  CheckCircle2, Building2, BarChart3, 
  Webhook, ShieldCheck, Activity, 
  Terminal as TerminalIcon, Search, Filter,
  AlertTriangle, Clock, TrendingUp, Settings2, Plus,
  DollarSign, ArrowUpRight, ArrowDownRight, Briefcase,
  Globe, Shield, ExternalLink, RefreshCw, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  getStoresWithStatusAction, 
  createStoreAction,
  updateStoreDomainsAction,
  verifyDnsAction
} from './actions/stores'
import { 
  updateStoreBillingAction, 
  recordAdminExpenseAction,
  getFinancialStatsAction
} from './actions/financial'
import { 
  logoutDeveloperAction
} from './actions/auth'
import { 
  getPendingMasterCatalogSubmissionsAction,
  approveMasterCatalogSubmissionAction,
  rejectMasterCatalogSubmissionAction,
  importEnrichedMasterCatalogSubmissionsAction,
  getApprovedMasterCatalogProductsAction
} from './actions/catalog'
import { cn } from '@/lib/utils'
import SystemLogs from './SystemLogs'
import SystemHealth from './SystemHealth'
import { useAuthStore } from '@/stores/authStore'

type Tab = 'DASHBOARD' | 'BUSINESS' | 'MONITOR' | 'CATALOG'

import { Store, FinancialStats, SystemLog } from '@/types'

interface StoreSettings {
  initialSettings?: Store[]
}

export default function DeveloperPanel({ initialSettings }: StoreSettings) {
  const { user } = useAuthStore()
  const userName = user?.firstName ? `${user.firstName} ${user.lastName}`.trim() : user?.email?.split('@')[0] || 'Developer'
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | 'ALL'>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingStore, setIsCreatingStore] = useState(false)
  const [newStore, setNewStore] = useState({ 
    name: '', 
    slug: '', 
    tier: 'austral',
    owner_email: '',
    contact_phone: '',
    address: '',
    city: '',
    payment_months: 1
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [billingForm, setBillingForm] = useState<{ tier?: string, payment_status?: string, next_payment_date?: string }>({})
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paid: 0,
    overdue: 0,
    austral: 0,
    archipielago: 0,
    patagonia: 0
  })
  const [finStats, setFinStats] = useState<FinancialStats>({ income: 0, expense: 0, profit: 0, monthlyData: [] })
  const [isRecordingExpense, setIsRecordingExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({ amount: 0, description: '' })
  const [managingDomainStore, setManagingDomainStore] = useState<Store | null>(null)
  const [domainInputs, setDomainInputs] = useState({ subdomain: '', customDomain: '' })
  const [isVerifyingDns, setIsVerifyingDns] = useState(false)
  const [expandedStore, setExpandedStore] = useState<string | null>(null)

  // Fase C: Master Catalog
  type Submission = {
    id: string
    sku: string
    name: string
    brand?: string
    category?: string
    description?: string
    image_url?: string
    status: string
    created_at: string
    stores?: { name: string }
  }
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null)
  const [catalogView, setCatalogView] = useState<'PENDING' | 'APPROVED'>('PENDING')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [approvedProducts, setApprovedProducts] = useState<any[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [catalogPage, setCatalogPage] = useState(0)
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogHasMore, setCatalogHasMore] = useState(false)
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true)
    const res = await getPendingMasterCatalogSubmissionsAction()
    if (res.success) {
      setSubmissions((res.data as unknown as Submission[]) || [])
    } else {
      toast.error('Error cargando submissions: ' + res.error)
    }
    setLoadingSubmissions(false)
  }

  useEffect(() => {
    if (activeTab === 'CATALOG') {
      if (catalogView === 'PENDING') {
        fetchSubmissions()
      } else {
        setCatalogPage(0)
        fetchApproved(catalogSearch, 0, false)
      }
    }
  }, [activeTab, catalogView])

  const fetchApproved = async (search = '', page = 0, isLoadMore = false) => {
    setLoadingApproved(true)
    const res = await getApprovedMasterCatalogProductsAction(search, page)
    if (res.success) {
      if (isLoadMore) {
        setApprovedProducts(prev => [...prev, ...(res.data || [])])
      } else {
        setApprovedProducts(res.data || [])
      }
      setCatalogTotal(res.total || 0)
      setCatalogHasMore((res.data?.length || 0) === res.pageSize)
    } else {
      toast.error('Error cargando catálogo: ' + res.error)
    }
    setLoadingApproved(false)
  }

  const handleExportSubmissions = () => {
    if (submissions.length === 0) {
      toast.error('No hay items pendientes para exportar')
      return
    }
    const dataStr = JSON.stringify(submissions, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'master_catalog_pending.json')
    linkElement.click()
  }

  const handleImportEnriched = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e2) => {
        try {
          const json = JSON.parse(e2.target?.result as string)
          if (!Array.isArray(json)) throw new Error('Debe ser un array')
          const res = await importEnrichedMasterCatalogSubmissionsAction(json)
          if (res.success) {
            toast.success(`✅ Importados ${res.updatedCount} registros enriquecidos`)
            fetchSubmissions()
          } else {
            toast.error('Error al importar: ' + res.error)
          }
        } catch (err) {
          toast.error('Archivo JSON inválido')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleApproveSubmission = async (id: string, data: Partial<Submission>) => {
    const res = await approveMasterCatalogSubmissionAction(id, data)
    if (res.success) {
      toast.success('✨ Aprobado y añadido al Catálogo Maestro')
      setEditingSubmission(null)
      fetchSubmissions()
    } else {
      toast.error('Error: ' + res.error)
    }
  }

  const handleRejectSubmission = async (id: string) => {
    const res = await rejectMasterCatalogSubmissionAction(id)
    if (res.success) {
      toast.success('Submission rechazada')
      fetchSubmissions()
    } else {
      toast.error('Error: ' + res.error)
    }
  }


  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [data, finances] = await Promise.all([
        getStoresWithStatusAction(),
        getFinancialStatsAction()
      ])
      
      setStores(data)
      setFinStats(finances as FinancialStats)
      
      const calculatedStats = {
        total: data.length,
        active: data.filter((s: Store) => s.is_active).length,
        paid: data.filter((s: Store) => s.payment_status === 'paid').length,
        overdue: data.filter((s: Store) => s.payment_status === 'overdue' || (s.next_payment_date && new Date(s.next_payment_date) < new Date())).length,
        austral: data.filter((s: Store) => s.tier === 'austral').length,
        archipielago: data.filter((s: Store) => s.tier === 'archipielago').length,
        patagonia: data.filter((s: Store) => s.tier === 'patagonia').length
      }
      setStats(calculatedStats)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos del panel')
    } finally {
      setIsLoading(false)
    }
  }


  const UF_VALUE = 38000
  const IVA = 1.19
  const tierPricesUF: Record<string, number> = { 
    austral: 1.0, 
    archipielago: 1.5, 
    patagonia: 2.5 
  }

  const handleCreateStore = async () => {
    if (!newStore.name || !newStore.slug || !newStore.owner_email) {
      toast.error('Nombre, Slug y Correo del Dueño son obligatorios')
      return
    }
    setIsCreatingStore(true)
    try {
      const result = await createStoreAction(newStore)
      if (result.success) {
        toast.success('✅ Tienda inicializada y propietario asignado')
        setNewStore({ 
          name: '', 
          slug: '', 
          tier: 'austral',
          owner_email: '',
          contact_phone: '',
          address: '',
          city: '',
          payment_months: 1
        })
        fetchData()
      } else {
        toast.error(result.error || 'Error al crear tienda')
      }
    } catch (error) {
      console.error('Error creando tienda:', error)
      toast.error('Error de conexión al crear la tienda. Intenta de nuevo.')
    } finally {
      setIsCreatingStore(false)
    }
  }

  const handleRecordExpense = async () => {
    if (newExpense.amount <= 0 || !newExpense.description) {
      toast.error('Monto y descripción requeridos')
      return
    }
    const result = await recordAdminExpenseAction(newExpense)
    if (result.success) {
      toast.success('✅ Gasto registrado')
      setNewExpense({ amount: 0, description: '' })
      setIsRecordingExpense(false)
      fetchData()
    } else {
      toast.error(result.error)
    }
  }


  const handleUpdateBilling = async (storeId: string, data: Partial<Store>) => {
    const result = await updateStoreBillingAction(storeId, data)
    if (result.success) {
      toast.success('✅ Facturación actualizada')
      setEditingStore(null)
      fetchData()
    } else {
      toast.error(result.error || 'Error al actualizar')
    }
  }

  const handleUpdateDomains = async () => {
    if (!managingDomainStore) return
    
    const result = await updateStoreDomainsAction(
      managingDomainStore.id, 
      domainInputs.subdomain, 
      domainInputs.customDomain
    )
    
    if (result.success) {
      toast.success('✅ Dominios actualizados')
      setManagingDomainStore(null)
      fetchData()
    } else {
      toast.error(result.error || 'Error al actualizar dominios')
    }
  }

  const handleVerifyDns = async () => {
    if (!managingDomainStore?.custom_domain) return
    
    setIsVerifyingDns(true)
    try {
      const result = await verifyDnsAction(managingDomainStore.id, managingDomainStore.custom_domain)
      
      if (result.success) {
        toast.success('✅ DNS Verificado correctamente')
        fetchData()
        // Actualizar estado local para mostrar el check verde
        setManagingDomainStore({ ...managingDomainStore, domain_verified: true })
      } else {
        toast.error(result.error || 'Fallo en la verificación DNS')
      }
    } catch (error) {
      console.error('Error verificando DNS:', error)
      toast.error('Error de conexión al verificar DNS. Intenta de nuevo.')
    } finally {
      setIsVerifyingDns(false)
    }
  }

  const handleLogout = async () => {
    await logoutDeveloperAction()
    window.location.reload()
  }

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs = [
    { id: 'DASHBOARD', label: 'Consola Central', icon: Layout },
    { id: 'BUSINESS', label: 'Gestión de Tiendas', icon: Building2 },
    { id: 'MONITOR', label: 'Monitor Operativo', icon: TerminalIcon },
    { id: 'CATALOG', label: 'Catálogo Maestro', icon: Database },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in pb-20 font-sans">
      {/* Header - Naranjo Control Deck Style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6 bg-[#0a0a0c]/80 border border-white/5 py-4 backdrop-blur-xl shadow-2xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/80">PATAGONIA_SaaS // COMMAND_CENTER</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-baseline gap-2">
            CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">INTERFACE</span>
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-amber-500/60">
              USER: <span className="text-gray-400">{userName}</span>
            </span>
            <span className="h-2 w-px bg-white/10" />
            <span className="flex items-center gap-1.5 text-amber-500/60">
              STATUS: <span className="text-amber-500">LIVE</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-none border-white/10 font-black uppercase tracking-widest text-[9px] transition-all h-8 px-4"
          >
            <LogOut className="h-3 w-3 mr-2" />
            CERRAR_SESIÓN
          </Button>
        </div>
      </div>

      {/* Tabs Navigation - Ultra Compact */}
      <div className="flex gap-px bg-white/5 border border-white/5 mx-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "relative px-6 py-2.5 transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] flex-1 md:flex-none",
              activeTab === tab.id 
                ? "text-amber-400 bg-amber-500/5"
                : "text-gray-600 hover:text-gray-400 bg-black/20"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.id ? "text-amber-400" : "text-gray-700")} />
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            )}
          </button>
        ))}
      </div>


      {/* Content Area - More Compact and Dense */}
      <div className="min-h-[500px] bg-black/40 border border-white/5 rounded-none p-6 backdrop-blur-sm shadow-2xl mx-4">
        
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-4 animate-slide-in">
            {/* KPI Cards - Higher Density */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Tiendas', val: stats.total, icon: Building2, color: 'text-amber-500' },
                { label: 'Activos', val: stats.active, icon: CheckCircle2, color: 'text-amber-500' },
                { label: 'Ingresos Totales', val: `$${finStats.income.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400' },
                { label: 'Profit Neto', val: `$${finStats.profit.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-400' },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#0f0f12] border border-white/5 p-4 flex items-center gap-4 group relative overflow-hidden">
                  <div className={cn("p-2 bg-white/5 border border-white/5", kpi.color)}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{kpi.label}</p>
                    <h3 className="text-xl font-black text-white italic tracking-tighter">{kpi.val}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Grid: Financial vs Operations */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Financial Performance */}
              <div className="lg:col-span-2 bg-[#0f0f12] border border-white/5 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    FINANCIAL_METRICS_V2
                  </h4>
                  <Button 
                    onClick={() => setIsRecordingExpense(true)}
                    size="sm"
                    className="h-7 text-[9px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-none px-3"
                  >
                    <Plus className="h-3 w-3 mr-1.5" /> Registrar Gasto
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Monthly Projection Visual (Simple Bars) */}
                  <div className="h-32 flex items-end gap-2 px-2 pt-4">
                    {finStats.monthlyData.length > 0 ? finStats.monthlyData.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex gap-0.5 items-end justify-center h-full">
                          <div 
                            className="w-full bg-amber-500/40 border-t border-amber-500/60 hover:bg-amber-500 transition-all cursor-help" 
                            style={{ height: `${Math.max(10, (m.income / (Math.max(...finStats.monthlyData.map(d => d.income)) || 1)) * 100)}%` }}
                            title={`Ingreso: $${m.income.toLocaleString()}`}
                          />
                          <div 
                            className="w-full bg-red-500/40 border-t border-red-500/60 hover:bg-red-500 transition-all cursor-help" 
                            style={{ height: `${Math.max(5, (m.expense / (Math.max(...finStats.monthlyData.map(d => d.income)) || 1)) * 100)}%` }}
                            title={`Gasto: $${m.expense.toLocaleString()}`}
                          />
                        </div>
                        <span className="text-[8px] font-black text-gray-700 uppercase">{m.month}</span>
                      </div>
                    )) : (
                      <div className="w-full h-full flex items-center justify-center border border-dashed border-white/5 text-[10px] text-gray-700 uppercase font-black">
                        Esperando datos operativos de mercado...
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-black/40 border border-white/5 p-3 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Efficiency</span>
                      <span className="text-[11px] font-black text-amber-500">{(finStats.profit / (finStats.income || 1) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-3 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Net Revenue</span>
                      <span className="text-[11px] font-black text-white">${finStats.profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Alerts */}
              <div className="bg-[#0f0f12] border border-white/5 p-5 space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  SYSTEM_ALERTS
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-white/[0.02] border-l-2 border-amber-500/50 space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Alertas de Pago</p>
                    <p className="text-[11px] font-bold text-white uppercase italic">
                      {stores.filter(s => s.payment_status === 'overdue').length} Tiendas Morosas
                    </p>
                  </div>
                  <div className="p-3 bg-white/[0.02] border-l-2 border-amber-500/50 space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Infraestructura</p>
                    <p className="text-[11px] font-bold text-white uppercase italic">CPU: 12% | RAM: 4.2GB</p>
                  </div>
                  <div className="p-3 bg-white/[0.02] border-l-2 border-orange-500/50 space-y-1">
                    <p className="text-[9px] font-black text-gray-500 uppercase">Suscripciones</p>
                    <p className="text-[11px] font-bold text-white uppercase italic">5 Renovaciones/Mes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Record Expense Modal */}
            {isRecordingExpense && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-[#0c0c0e] border border-red-500/30 max-w-sm w-full p-6 space-y-4">
                  <h3 className="text-sm font-black uppercase italic text-white text-red-500">Registrar Egreso del Sistema</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Monto ($)</label>
                      <input 
                        type="number"
                        className="w-full bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-red-500/50"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Descripción / Glosa</label>
                      <input 
                        className="w-full bg-black border border-white/10 p-2 text-xs text-white outline-none focus:border-red-500/50"
                        placeholder="Ej: Pago Servidor AWS"
                        value={newExpense.description}
                        onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setIsRecordingExpense(false)} className="flex-1 rounded-none text-[10px] font-black uppercase">Cancelar</Button>
                      <Button onClick={handleRecordExpense} className="flex-1 bg-red-600 hover:bg-red-500 rounded-none text-[10px] font-black uppercase">Confirmar Gasto</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'BUSINESS' && (
          <div className="space-y-6 animate-slide-in">
            {/* Actions Bar - Compact */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
                <input 
                  type="text"
                  placeholder="FILTRAR TIENDAS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 py-2.5 pl-10 pr-4 text-[11px] font-bold uppercase tracking-widest text-white focus:border-amber-500/40 outline-none transition-all placeholder:text-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsCreatingStore(true)}
                  className="bg-amber-600 hover:bg-amber-500 rounded-none text-[10px] font-black uppercase tracking-widest h-10 px-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Nueva Tienda
                </Button>
                <Button 
                  variant="outline"
                  onClick={fetchData}
                  className="border-white/10 hover:bg-white/5 rounded-none text-[10px] font-black uppercase tracking-widest h-10 px-6 text-gray-500"
                >
                  Sync
                </Button>
              </div>
            </div>

            {/* Business Table - Compact Typography */}
            <div className="bg-black/60 border border-white/5 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 bg-white/[0.02]">
                    <th className="p-4">Identificador</th>
                    <th className="p-4">Plan / Tier</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Vencimiento</th>
                    <th className="p-4">Sucursales</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-[11px] text-gray-600 uppercase font-black tracking-widest">
                        Cargando registros operativos...
                      </td>
                    </tr>
                  ) : filteredStores.map(store => (
                    <Fragment key={store.id}>
                      <tr className="hover:bg-white/5 transition-colors group">
                        <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-500 italic text-[11px]">
                            {store.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-white uppercase tracking-widest">{store.name}</div>
                            <div className="text-[9px] text-gray-600 font-mono tracking-tighter">SLUG: {store.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border",
                          store.tier === 'patagonia' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          store.tier === 'archipielago' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-white/5 text-gray-500 border-white/10'
                        )}>
                          {store.tier}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full shadow-[0_0_5px]",
                            store.payment_status === 'paid' ? 'bg-amber-500 shadow-amber-500' :
                            store.payment_status === 'pending' ? 'bg-orange-500 shadow-orange-500' :
                            'bg-red-500 shadow-red-500'
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            store.payment_status === 'paid' ? 'text-amber-400' :
                            store.payment_status === 'pending' ? 'text-orange-400' :
                            'text-red-400'
                          )}>
                            {store.payment_status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Clock className="h-3.5 w-3.5" />
                          {store.next_payment_date ? new Date(store.next_payment_date).toLocaleDateString('es-CL') : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-amber-400 transition-colors"
                        >
                          {(store as Store & { branches?: {id:string,name:string,is_active:boolean}[] }).branches?.length === 1
                            ? '1 sucursal'
                            : `${(store as Store & { branches?: {id:string,name:string,is_active:boolean}[] }).branches?.length || 0} sucursales`}
                          <ChevronDown className={cn("h-3 w-3 transition-transform", expandedStore === store.id && "rotate-180")} />
                        </button>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setManagingDomainStore(store)
                            setDomainInputs({ 
                              subdomain: store.subdomain || '', 
                              customDomain: store.custom_domain || '' 
                            })
                          }}
                          className="h-8 rounded-none border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 hover:text-amber-400"
                          title="Gestionar Dominios"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingStore(store)
                            setBillingForm({
                              tier: store.tier,
                              payment_status: store.payment_status,
                              next_payment_date: store.next_payment_date ? new Date(store.next_payment_date).toISOString().split('T')[0] : ''
                            })
                          }}
                          className="h-8 rounded-none border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 hover:text-amber-400"
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-2" />
                          EDITAR
                        </Button>
                      </td>
                    </tr>
                    {expandedStore === store.id && (
                      <tr className="bg-black/40">
                        <td colSpan={6} className="p-4 pl-8">
                          {(store as Store & { branches?: {id:string,name:string,is_active:boolean}[] }).branches?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {(store as Store & { branches?: {id:string,name:string,is_active:boolean}[] }).branches!.map(b => (
                                <span key={b.id} className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border",
                                  b.is_active ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-gray-600/30 text-gray-500 bg-gray-500/5"
                                )}>
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-600 uppercase font-bold">Sin sucursales registradas</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Modal - Ultra Compact UI */}
            {isCreatingStore && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-[#0c0c0e] border border-amber-500/40 max-w-2xl w-full p-8 space-y-6 relative shadow-[0_0_50px_rgba(0,0,0,1)]">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600" />
                  
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-3 tracking-tighter">
                      <Building2 className="text-amber-500 h-5 w-5" />
                      INICIAR_PROTOCOLO_NUEVA_TIENDA
                    </h3>
                    <div className="text-[9px] font-bold text-amber-500/30 uppercase tracking-[0.3em]">v4.0.2 // ESTABLE</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Razón Social</label>
                        <input 
                          className="w-full bg-black/60 border border-white/10 p-3 text-[13px] text-white font-bold outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-800" 
                          placeholder="Austral Market Pro"
                          value={newStore.name}
                          onChange={e => setNewStore({...newStore, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">URL_IDENTIFICADOR (Único)</label>
                        <input 
                          className="w-full bg-black/60 border border-white/10 p-3 text-[13px] text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-all" 
                          value={newStore.slug}
                          onChange={e => setNewStore({...newStore, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Email del Propietario</label>
                        <input 
                          type="email"
                          className="w-full bg-black/60 border border-white/10 p-3 text-[13px] text-white font-bold outline-none focus:border-amber-500/50 transition-all" 
                          placeholder="admin@austral.cl"
                          value={newStore.owner_email}
                          onChange={e => setNewStore({...newStore, owner_email: e.target.value})}
                        />
                        <p className="text-[9px] text-amber-500/40 font-bold uppercase">Automated Admin assignment on registration</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ubicación Operacional</label>
                        <div className="flex gap-2">
                          <input 
                            className="flex-[2] min-w-0 bg-black/60 border border-white/10 p-3 text-[13px] text-white font-bold outline-none focus:border-amber-500/50" 
                            placeholder="Address"
                            value={newStore.address}
                            onChange={e => setNewStore({...newStore, address: e.target.value})}
                          />
                          <input 
                            className="flex-1 min-w-0 bg-black/60 border border-white/10 p-3 text-[13px] text-white font-bold outline-none focus:border-amber-500/50" 
                            placeholder="City"
                            value={newStore.city}
                            onChange={e => setNewStore({...newStore, city: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Selección de Plan SaaS</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-black border border-white/10 p-3 text-[13px] text-white font-black uppercase outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                            style={{ backgroundColor: 'black', color: 'white' }}
                            value={newStore.tier}
                            onChange={e => setNewStore({...newStore, tier: e.target.value as 'austral' | 'archipielago' | 'patagonia'})}
                          >
                            <option value="austral" style={{ backgroundColor: '#0c0c0e', color: 'white' }}>AUSTRAL (1.0 UF + IVA / mes)</option>
                            <option value="archipielago" style={{ backgroundColor: '#0c0c0e', color: 'white' }}>ARCHIPIÉLAGO (1.5 UF + IVA / mes)</option>
                            <option value="patagonia" style={{ backgroundColor: '#0c0c0e', color: 'white' }}>PATAGONIA (2.5 UF + IVA / mes)</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ArrowDownRight className="h-4 w-4 text-amber-500" />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Suscripción (Meses)</label>
                          <input 
                            type="number"
                            min="1"
                            className="w-full bg-black/60 border border-white/10 p-3 text-[13px] text-white font-bold outline-none focus:border-amber-500/50" 
                            value={newStore.payment_months}
                            onChange={e => setNewStore({...newStore, payment_months: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Facturación Inicial (incl. IVA)</label>
                          <div className="bg-orange-500/10 border border-orange-500/20 p-3 flex flex-col justify-center h-[46px]">
                            <span className="text-[14px] font-black text-amber-400 italic">
                              ${Math.round((tierPricesUF[newStore.tier] || 0) * UF_VALUE * IVA * newStore.payment_months).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-white/5">
                    <Button 
                      onClick={() => setIsCreatingStore(false)}
                      variant="ghost"
                      className="flex-1 rounded-none text-[11px] font-black uppercase tracking-widest text-gray-600 hover:text-white"
                    >
                      CANCELAR
                    </Button>
                    <Button 
                      onClick={handleCreateStore}
                      disabled={isCreatingStore}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-none text-[11px] font-black uppercase tracking-widest py-6"
                    >
                      {isCreatingStore ? 'INICIALIZANDO...' : 'CREAR_TIENDA'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {editingStore && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-[#0c0c0e] border border-amber-500/40 max-w-md w-full p-8 space-y-6 relative shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-amber-600 to-orange-600" />
                  
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-3 tracking-tighter">
                      <Settings2 className="text-amber-500 h-5 w-5" />
                      EDITAR_NEGOCIO: {editingStore.name}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setEditingStore(null)} className="text-gray-600 hover:text-white">×</Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Selección de Plan SaaS</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-black border border-white/10 p-3 text-[13px] text-white font-black uppercase outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                          value={billingForm.tier || 'austral'}
                          onChange={e => setBillingForm({...billingForm, tier: e.target.value})}
                        >
                          <option value="austral">Austral</option>
                          <option value="archipielago">Archipiélago</option>
                          <option value="patagonia">Patagonia</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ArrowDownRight className="h-4 w-4 text-amber-500" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado de Pago</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-black border border-white/10 p-3 text-[13px] text-white font-black uppercase outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                          value={billingForm.payment_status || 'paid'}
                          onChange={e => setBillingForm({...billingForm, payment_status: e.target.value})}
                        >
                          <option value="paid">Pagado</option>
                          <option value="pending">Pendiente</option>
                          <option value="overdue">Atrasado</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ArrowDownRight className="h-4 w-4 text-amber-500" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Próximo Vencimiento</label>
                      <input 
                        type="date"
                        className="w-full bg-black/60 border border-white/10 p-3 text-[13px] text-white font-mono outline-none focus:border-amber-500/50" 
                        value={billingForm.next_payment_date || ''}
                        onChange={e => setBillingForm({...billingForm, next_payment_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button 
                      onClick={() => setEditingStore(null)}
                      variant="ghost"
                      className="flex-1 rounded-none text-[11px] font-black uppercase tracking-widest text-gray-600 hover:text-white"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => handleUpdateBilling(editingStore.id, { 
                        tier: billingForm.tier as 'austral' | 'archipielago' | 'patagonia', 
                        payment_status: billingForm.payment_status as 'paid' | 'pending' | 'overdue',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        next_payment_date: billingForm.next_payment_date ? (new Date(billingForm.next_payment_date).toISOString() as any) : null
                      })}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-none text-[11px] font-black uppercase tracking-widest"
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Domain Management Modal */}
            {managingDomainStore && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-[#0c0c0e] border border-amber-500/40 max-w-md w-full p-8 space-y-6 relative shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-amber-600 to-orange-600" />
                  
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-3 tracking-tighter">
                      <Globe className="text-amber-500 h-5 w-5" />
                      DOMAIN_CONFIG: {managingDomainStore.name}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setManagingDomainStore(null)} className="text-gray-600 hover:text-white">×</Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Subdominio Plataforma</label>
                      <div className="flex items-center gap-2">
                        <input 
                          className="flex-1 bg-black/60 border border-white/10 p-3 text-[13px] text-white font-mono outline-none focus:border-amber-500/50" 
                          placeholder="tienda"
                          value={domainInputs.subdomain}
                          onChange={e => setDomainInputs({...domainInputs, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        />
                        <span className="text-[10px] font-black text-gray-500">.australmarket.cl</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Dominio Personalizado</label>
                      <div className="flex gap-2">
                        <input 
                          className="flex-1 bg-black/60 border border-white/10 p-3 text-[13px] text-white font-mono outline-none focus:border-amber-500/50" 
                          placeholder="www.tu-dominio.com"
                          value={domainInputs.customDomain}
                          onChange={e => setDomainInputs({...domainInputs, customDomain: e.target.value.toLowerCase()})}
                        />
                        {managingDomainStore.custom_domain && (
                          <div className={cn(
                            "p-3 border flex items-center justify-center",
                            managingDomainStore.domain_verified 
                              ? "bg-green-500/10 border-green-500/30 text-green-500" 
                              : "bg-red-500/10 border-red-500/30 text-red-500"
                          )}>
                            {managingDomainStore.domain_verified ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 opacity-30" />}
                          </div>
                        )}
                      </div>
                      
                      {domainInputs.customDomain && (
                        <div className="bg-white/[0.02] border border-white/5 p-3 space-y-2 mt-2">
                          <p className="text-[9px] font-black text-gray-500 uppercase">Instrucciones DNS:</p>
                          <p className="text-[10px] font-mono text-amber-500/80">CNAME @ → proxy.australmarket.cl</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isVerifyingDns}
                            onClick={handleVerifyDns}
                            className="w-full h-8 rounded-none border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/10"
                          >
                            {isVerifyingDns ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <ShieldCheck className="h-3 w-3 mr-2" />}
                            Verificar Registros DNS
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button 
                      onClick={() => setManagingDomainStore(null)}
                      variant="ghost"
                      className="flex-1 rounded-none text-[11px] font-black uppercase tracking-widest text-gray-600"
                    >
                      Cerrar
                    </Button>
                    <Button 
                      onClick={handleUpdateDomains}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 rounded-none text-[11px] font-black uppercase tracking-widest"
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        {activeTab === 'MONITOR' && (
          <div className="space-y-6 animate-slide-in">
            {/* Contextual Selector - Refined */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-amber-500/5 border border-amber-500/10 p-4 rounded-none">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20">
                  <TerminalIcon className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-400">Contexto de Monitoreo</h4>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Filtrar logs y métricas por tienda específica</p>
                </div>
              </div>
              <div className="relative w-full md:w-auto">
                <select 
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full md:w-64 bg-black border border-white/10 text-[10px] font-black uppercase tracking-widest text-amber-400 px-6 py-2.5 outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                >
                  <option value="ALL">VISTA_GLOBAL (TODOS)</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ArrowDownRight className="h-3.5 w-3.5 text-amber-500/40" />
                </div>
              </div>
            </div>

            {/* System Health Cards */}
            <SystemHealth storeId={selectedStoreId} />
            
            {/* Real-Time Log Console */}
            <SystemLogs storeId={selectedStoreId} />
          </div>
        )}

        {activeTab === 'CATALOG' && (
          <div className="space-y-6 animate-slide-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-amber-500/5 border border-amber-500/10 p-4 rounded-none">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20">
                  <Database className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-400">Moderación Catálogo Maestro</h4>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Pendientes de revisión y enriquecimiento IA</p>
                </div>
              </div>
              <div className="flex gap-2">
                {catalogView === 'PENDING' ? (
                  <>
                    <Button 
                      onClick={handleExportSubmissions}
                      variant="outline"
                      className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-none text-[10px] font-black uppercase tracking-widest h-10 px-4"
                    >
                      <ArrowDownRight className="h-3.5 w-3.5 mr-2" />
                      Exportar para IA
                    </Button>
                    <Button 
                      onClick={handleImportEnriched}
                      className="bg-amber-600 hover:bg-amber-500 rounded-none text-[10px] font-black uppercase tracking-widest h-10 px-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
                      Importar Enriquecido
                    </Button>
                  </>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Buscar en catálogo..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setCatalogPage(0)
                          fetchApproved(catalogSearch, 0, false)
                        }
                      }}
                      className="bg-black/60 border border-white/10 pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white focus:border-amber-500/40 outline-none h-10"
                    />
                  </div>
                )}
                <Button 
                  onClick={() => {
                    if (catalogView === 'PENDING') {
                      fetchSubmissions()
                    } else {
                      setCatalogPage(0)
                      fetchApproved(catalogSearch, 0, false)
                    }
                  }}
                  variant="outline"
                  className="border-white/10 text-gray-500 hover:bg-white/5 rounded-none h-10 px-3"
                  title="Recargar"
                >
                  <RefreshCw className={cn("h-4 w-4", (loadingSubmissions || loadingApproved) && "animate-spin")} />
                </Button>
              </div>
            </div>

            <div className="flex gap-px bg-white/5 border border-white/5">
              <button
                onClick={() => setCatalogView('PENDING')}
                className={cn(
                  "relative px-6 py-2 transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] flex-1",
                  catalogView === 'PENDING' ? "text-amber-400 bg-amber-500/5" : "text-gray-600 hover:text-gray-400 bg-black/20"
                )}
              >
                Pendientes
                {catalogView === 'PENDING' && <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber-500" />}
              </button>
              <button
                onClick={() => setCatalogView('APPROVED')}
                className={cn(
                  "relative px-6 py-2 transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] flex-1",
                  catalogView === 'APPROVED' ? "text-amber-400 bg-amber-500/5" : "text-gray-600 hover:text-gray-400 bg-black/20"
                )}
              >
                Catálogo Aprobado
                {catalogView === 'APPROVED' && <div className="absolute bottom-0 left-0 w-full h-[1px] bg-amber-500" />}
              </button>
            </div>

            <div className="bg-black/60 border border-white/5 overflow-x-auto">
              <table className="w-full text-left">
                {catalogView === 'PENDING' ? (
                  <>
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 bg-white/[0.02]">
                        <th className="p-4">SKU / Origen</th>
                        <th className="p-4">Datos (Nombre, Marca, Categoría)</th>
                        <th className="p-4">Descripción (Enriquecida)</th>
                        <th className="p-4 text-right min-w-[200px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingSubmissions ? (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-[11px] text-gray-600 uppercase font-black tracking-widest">
                            Cargando cola de revisión...
                          </td>
                        </tr>
                      ) : submissions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-20 text-center text-[11px] text-gray-600 uppercase font-black tracking-widest">
                            No hay productos pendientes
                          </td>
                        </tr>
                      ) : submissions.map(sub => (
                        <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4 align-top">
                            <div className="text-[12px] font-black text-amber-400 font-mono">{sub.sku}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">
                              Vía: {sub.stores?.name || 'Desconocido'}
                            </div>
                            <div className="text-[9px] text-gray-600 font-bold mt-0.5">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            {editingSubmission?.id === sub.id ? (
                              <div className="space-y-2">
                                <input 
                                  value={editingSubmission.name} 
                                  onChange={e => setEditingSubmission({...editingSubmission, name: e.target.value})}
                                  className="w-full bg-black border border-white/10 p-2 text-xs text-white" 
                                  placeholder="Nombre"
                                />
                                <div className="flex gap-2">
                                  <input 
                                    value={editingSubmission.brand || ''} 
                                    onChange={e => setEditingSubmission({...editingSubmission, brand: e.target.value})}
                                    className="w-full bg-black border border-white/10 p-2 text-xs text-white" 
                                    placeholder="Marca"
                                  />
                                  <input 
                                    value={editingSubmission.category || ''} 
                                    onChange={e => setEditingSubmission({...editingSubmission, category: e.target.value})}
                                    className="w-full bg-black border border-white/10 p-2 text-xs text-white" 
                                    placeholder="Categoría"
                                  />
                                </div>
                                <input 
                                  value={editingSubmission.image_url || ''} 
                                  onChange={e => setEditingSubmission({...editingSubmission, image_url: e.target.value})}
                                  className="w-full bg-black border border-white/10 p-2 text-xs text-white" 
                                  placeholder="URL de Imagen"
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="text-[13px] font-black text-white">{sub.name}</div>
                                <div className="flex gap-2 mt-1">
                                  {sub.brand && <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{sub.brand}</span>}
                                  {sub.category && <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{sub.category}</span>}
                                </div>
                                {sub.image_url && <a href={sub.image_url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 hover:underline mt-2 inline-block">Ver imagen</a>}
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            {editingSubmission?.id === sub.id ? (
                              <textarea 
                                value={editingSubmission.description || ''} 
                                onChange={e => setEditingSubmission({...editingSubmission, description: e.target.value})}
                                className="w-full h-full min-h-[80px] bg-black border border-white/10 p-2 text-xs text-white" 
                                placeholder="Descripción (IA)"
                              />
                            ) : (
                              <div className={cn("text-[10px] leading-relaxed max-w-sm", sub.description ? "text-gray-300" : "text-gray-600 italic")}>
                                {sub.description || 'Sin descripción...'}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right align-top">
                            {editingSubmission?.id === sub.id ? (
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApproveSubmission(sub.id, editingSubmission)}
                                  className="h-8 bg-green-600 hover:bg-green-500 rounded-none text-[9px] font-black uppercase"
                                >
                                  Guardar y Aprobar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setEditingSubmission(null)}
                                  className="h-8 border border-white/10 text-gray-400 rounded-none text-[9px] font-black uppercase hover:bg-white/5"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApproveSubmission(sub.id, sub)}
                                  className="h-8 bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-none text-[9px] font-black uppercase"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1.5" /> Aprobar Rápido
                                </Button>
                                <div className="flex gap-2 w-full">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setEditingSubmission(sub)}
                                    className="flex-1 h-8 border border-white/10 text-gray-400 rounded-none text-[9px] font-black uppercase hover:bg-white/5"
                                  >
                                    Editar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => {
                                      if(confirm('¿Seguro que deseas rechazar este registro?')) {
                                        handleRejectSubmission(sub.id)
                                      }
                                    }}
                                    className="flex-1 h-8 border border-red-500/20 text-red-500 rounded-none text-[9px] font-black uppercase hover:bg-red-500/10"
                                  >
                                    Rechazar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 bg-white/[0.02]">
                        <th className="p-4">SKU</th>
                        <th className="p-4">Nombre</th>
                        <th className="p-4">Marca</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4 text-right">Precio Ref.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loadingApproved ? (
                        <tr>
                          <td colSpan={5} className="p-20 text-center text-[11px] text-gray-600 uppercase font-black tracking-widest">
                            Cargando catálogo aprobado...
                          </td>
                        </tr>
                      ) : approvedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-20 text-center text-[11px] text-gray-600 uppercase font-black tracking-widest">
                            No hay productos en el catálogo maestro
                          </td>
                        </tr>
                      ) : approvedProducts.map(prod => (
                        <tr key={prod.sku} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="text-[12px] font-black text-amber-400 font-mono">{prod.sku}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-[13px] font-black text-white">{prod.name}</div>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{prod.brand || '-'}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{prod.category || '-'}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-[11px] font-black text-white">
                              {prod.reference_price ? `$${prod.reference_price.toLocaleString()}` : '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
              {catalogView === 'APPROVED' && catalogHasMore && (
                <div className="flex justify-center p-4 border-t border-white/5">
                  <Button 
                    onClick={() => {
                      const nextPage = catalogPage + 1
                      setCatalogPage(nextPage)
                      fetchApproved(catalogSearch, nextPage, true)
                    }}
                    disabled={loadingApproved}
                    variant="outline"
                    className="border-white/10 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10"
                  >
                    Cargar más ({approvedProducts.length} de {catalogTotal})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
