import { createClient } from '@/lib/supabase'

export interface AIUsageRecord {
  store_id: string
  user_id?: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  cost: number
  feature: string
}

/**
 * Registra el uso de IA en la base de datos para auditoría y control de costos.
 */
export async function logAIUsage(record: AIUsageRecord) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('ai_usage_logs')
    .insert([{
      store_id: record.store_id,
      user_id: record.user_id,
      model: record.model,
      prompt_tokens: record.prompt_tokens,
      completion_tokens: record.completion_tokens,
      cost: record.cost,
      feature: record.feature
    }])

  if (error) {
    console.error('[AI Usage] Error logging usage:', error)
    return { success: false, error }
  }

  return { success: true }
}

/**
 * Calcula el costo estimado basado en el modelo y tokens.
 * Precios aproximados para GPT-4o o similares.
 */
export function calculateAICost(model: string, promptTokens: number, completionTokens: number): number {
  // Precios por 1M de tokens (ejemplo GPT-4o)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 5.0, completion: 15.0 },
    'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
    'gemini-1.5-pro': { prompt: 3.5, completion: 10.5 },
    'gemini-1.5-flash': { prompt: 0.075, completion: 0.30 },
  }

  const modelPricing = pricing[model] || pricing['gpt-4o-mini']
  const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt
  const completionCost = (completionTokens / 1_000_000) * modelPricing.completion

  return Number((promptCost + completionCost).toFixed(5))
}
