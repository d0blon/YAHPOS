'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

/**
 * Actualiza el plan y estado de facturación de un negocio específico.
 */
export async function updateStoreBillingAction(storeId: string, data: { tier?: string, next_payment_date?: string | null, payment_status?: string }) {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('stores')
    .update(data)
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/developer')
  return { success: true }
}

/**
 * Obtiene estadísticas financieras detalladas del administrador.
 */
export async function getFinancialStatsAction() {
  const supabase = createAdminClient()
  
  try {
    const { data: transactions, error } = await supabase
      .from('admin_finances')
      .select('amount, type, created_at')
      .order('created_at', { ascending: true })

    if (error) throw error

    const income = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const expense = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Agrupar por mes para gráficos futuros
    const monthlyData: Record<string, { income: number, expense: number }> = {}
    transactions?.forEach(t => {
      const month = new Date(t.created_at).toLocaleString('es-CL', { month: 'short' })
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyData[month].income += Number(t.amount)
      else monthlyData[month].expense += Number(t.amount)
    })

    return {
      income,
      expense,
      profit: income - expense,
      monthlyData: Object.entries(monthlyData).map(([name, data]) => ({ name, ...data })),
      simulated: (transactions || []).length === 0
    }
  } catch (err) {
    console.error("Error in financial stats:", err)
    return { income: 0, expense: 0, profit: 0, monthlyData: [], error: true }
  }
}

/**
 * Registra un gasto administrativo (ej. infraestructura, APIs).
 */
export async function recordAdminExpenseAction(data: { amount: number, description: string }) {
  const supabase = createAdminClient()
  
  try {
    const { error } = await supabase.from('admin_finances').insert({
      amount: data.amount,
      type: 'expense',
      description: data.description
    })

    if (error) throw error
    
    revalidatePath('/developer')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
