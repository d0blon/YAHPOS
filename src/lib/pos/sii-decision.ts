import { TERMINALS_WITH_DTE, VOUCHER_METHODS } from '@/lib/hardware/types'

export type SiiEmissionMode = 'always' | 'voucher_only'
export type SiiDecisionKind = 'dte' | 'voucher' | 'blocked'
export type SiiDecisionReason =
  | 'voucher_method'
  | 'terminal_dte'
  | 'business_no_sii'
  | 'blocked_terminal'
  | 'sii'

export interface SiiDecisionInput {
  paymentMethod: string
  terminalType?: string
  settings: {
    siiEmission: SiiEmissionMode
    terminalsDte?: Record<string, boolean>
  }
}

export interface SiiDecision {
  kind: SiiDecisionKind
  reason: SiiDecisionReason
}

const TERMINAL_ALIASES: Record<string, string> = {
  SumUp: 'SumUp Solo',
}

export function normalizeTerminalType(terminalType?: string): string | undefined {
  if (!terminalType) return undefined
  return TERMINAL_ALIASES[terminalType] ?? terminalType
}

function declaredDte(terminalType?: string): boolean {
  const normalized = normalizeTerminalType(terminalType)
  return normalized ? TERMINALS_WITH_DTE[normalized] === true : false
}

function explicitDteToggle(input: SiiDecisionInput): boolean | undefined {
  const normalized = normalizeTerminalType(input.terminalType)
  const toggles = input.settings.terminalsDte
  if (!toggles) return undefined
  if (normalized && toggles[normalized] !== undefined) return toggles[normalized]
  return input.terminalType ? toggles[input.terminalType] : undefined
}

function effectiveDte(input: SiiDecisionInput): boolean {
  return declaredDte(input.terminalType) && explicitDteToggle(input) !== false
}

export function decideSiiEmission(input: SiiDecisionInput): SiiDecision {
  const isTerminalPayment = input.paymentMethod === 'TERMINAL'
  const isVoucherMethod = (VOUCHER_METHODS as readonly string[]).includes(input.paymentMethod)

  if (isTerminalPayment && declaredDte(input.terminalType) && explicitDteToggle(input) === false) {
    return { kind: 'blocked', reason: 'blocked_terminal' }
  }

  if (input.settings.siiEmission === 'voucher_only') {
    return { kind: 'voucher', reason: 'business_no_sii' }
  }

  if (isVoucherMethod) {
    return { kind: 'voucher', reason: 'voucher_method' }
  }

  if (isTerminalPayment && effectiveDte(input)) {
    return { kind: 'voucher', reason: 'terminal_dte' }
  }

  return { kind: 'dte', reason: 'sii' }
}
