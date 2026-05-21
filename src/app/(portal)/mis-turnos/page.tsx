'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Briefcase, ChevronRight, History } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'

export default function MisTurnosPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [currentArea, setCurrentArea] = useState<string>('Cargando...')
  const [shifts, setShifts] = useState<any[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const loadProfileData = async () => {
    if (!user?.id) return

    // 1. Obtener la ubicación actual
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_area')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      setCurrentArea(profile.current_area || 'Ausente')
    }

    // 2. Obtener últimas asignaciones / historial (si tenemos)
    const { data: shiftHistory } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(10)
    
    if (shiftHistory) {
      setShifts(shiftHistory)
      const current = shiftHistory.find((s: any) => s.status === 'active')
      setActiveShift(current || null)
    }
  }

  useEffect(() => {
    loadProfileData()
  }, [user])

  const toggleShift = async () => {
    if (!user?.id || isSyncing) return
    setIsSyncing(true)

    try {
      if (activeShift) {
        // Cerrar turno
        await supabase
          .from('shifts')
          .update({ status: 'completed', end_time: new Date().toISOString() })
          .eq('id', activeShift.id)
        
        await supabase
          .from('profiles')
          .update({ current_area: 'Inactivo' })
          .eq('id', user.id)
          
      } else {
        // Iniciar turno
        await supabase
          .from('shifts')
          .insert([{
            user_id: user.id,
            area: currentArea === 'Ausente' || currentArea === 'Inactivo' ? 'Punto de Venta' : currentArea,
            status: 'active'
          }])

        if (currentArea === 'Ausente' || currentArea === 'Inactivo') {
           await supabase
            .from('profiles')
            .update({ current_area: 'Punto de Venta' })
            .eq('id', user.id)
        }
      }
      await loadProfileData()
    } catch (err) {
      console.error('Error toggling shift', err)
    } finally {
      setIsSyncing(false)
    }
  }

  if (!isHydrated) return null

  if (!isAuthenticated || !user) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-32 flex items-center justify-center">
          <p className="text-gray-500 font-medium">Por favor inicia sesión para ver tus turnos.</p>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-accent-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent-500/20">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Portal de Turnos</h1>
              <p className="text-gray-500 font-medium">Hola {user.firstName}, aquí está el estado de tus horas.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Lado Izquierdo: Resumen Actual */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-2 border-brand-primary/20 bg-brand-accent-50/50 dark:bg-brand-accent-900/10 shadow-lg shadow-brand-accent-500/5">
                <CardHeader className="pb-3">
                  <p className="text-xs font-black uppercase tracking-widest text-brand-primary">Ubicación Asignada Hoy</p>
                  <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">{currentArea}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tu administrador o encargado te ha posicionado en esta área de la sucursal. 
                  </p>
                  <div className="mt-4 border-t border-brand-accent-200/50 dark:border-brand-accent-800/50 pt-4">
                    <button
                      onClick={toggleShift}
                      disabled={isSyncing}
                      className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        activeShift 
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                      {isSyncing ? 'Sincronizando...' : activeShift ? 'Finalizar Turno' : 'Iniciar Turno'}
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tus Estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium">Rol del Sistema</span>
                    <Badge variant="outline" className="capitalize">{user.role === 'admin' ? 'Encargado' : user.role === 'cashier' ? 'Cajero/Colaborador' : user.role}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-medium">Puntos Austral</span>
                    <span className="font-bold text-gray-900 dark:text-white">{user.loyaltyPoints}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lado Derecho: Historial */}
            <div className="md:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Historial de Turnos y Movimientos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin registros aún</h3>
                      <p className="text-gray-500 mt-1 max-w-sm">No se han registrado cierres de caja ni aperturas de turno asociadas a tu cuenta recientemente.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shifts.map((shift, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={shift.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500'}>
                                {shift.status === 'active' ? 'En Curso' : 'Finalizado'}
                              </Badge>
                              <span className="font-bold text-gray-900 dark:text-white">{shift.area}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Iniciado: {new Date(shift.start_time).toLocaleString('es-CL')}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
