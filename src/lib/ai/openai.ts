import OpenAI from 'openai'
import { calculateAICost, logAIUsage } from './usage'

// Lazy-init: do NOT instantiate at module level — build will fail without the API key
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to .env.local')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

interface AIGenerationOptions {
  storeId: string
  userId?: string
  feature: string
  model?: string
}

/**
 * Generador base de texto con IA con logging automático de costos.
 */
export async function generateAIText(
  prompt: string,
  systemPrompt: string = 'Eres un asistente experto en e-commerce y POS.',
  options: AIGenerationOptions
) {
  const model = options.model || 'gpt-4o-mini'

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    })

    const content = response.choices[0].message.content
    const promptTokens = response.usage?.prompt_tokens || 0
    const completionTokens = response.usage?.completion_tokens || 0
    const cost = calculateAICost(model, promptTokens, completionTokens)

    // Log usage asynchronously (fire-and-forget)
    logAIUsage({
      store_id: options.storeId,
      user_id: options.userId,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost,
      feature: options.feature,
    })

    return { content, cost, success: true }
  } catch (error) {
    console.error('[AI Service] Error generating text:', error)
    return { error, success: false }
  }
}
