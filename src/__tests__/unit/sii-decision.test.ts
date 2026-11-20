import {
  decideSiiEmission,
  normalizeTerminalType,
  type SiiDecision,
  type SiiDecisionInput,
} from '@/lib/pos/sii-decision'

// Precedencia (ver decideSiiEmission):
// 1) TERMINAL con terminal declarado DTE y toggle explícitamente OFF => blocked.
//    El bloqueo sólo aplica al método TERMINAL: un terminalType stale en EFECTIVO,
//    TARJETA o WEBPAY_QR no puede bloquear ni saltar la boleta (bug deletreado arriba).
// 2) voucher_only => voucher/business_no_sii (gana incluso a voucher_method y terminal_dte).
// 3) método voucher => voucher/voucher_method.
// 4) TERMINAL con terminal declarado DTE y toggle no-OFF => voucher/terminal_dte.
//    Un terminal no declarado (SumUp Air) nunca salta el SII aunque el toggle esté ON.
// 5) gateway (WEBPAY_QR) y resto => dte/sii.
const settingsAlways = { siiEmission: 'always' as const }

const cases: Array<{ name: string; input: SiiDecisionInput; expected: SiiDecision }> = [
  {
    name: 'EFECTIVO emite DTE',
    input: { paymentMethod: 'EFECTIVO', settings: settingsAlways },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'TARJETA emite DTE',
    input: { paymentMethod: 'TARJETA', settings: settingsAlways },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'WEBPAY_QR emite DTE (gateway gana aunque venga terminalType stale)',
    input: { paymentMethod: 'WEBPAY_QR', terminalType: 'TUU', settings: { siiEmission: 'always', terminalsDte: { TUU: true } } },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'JUNAEB es voucher',
    input: { paymentMethod: 'JUNAEB', settings: settingsAlways },
    expected: { kind: 'voucher', reason: 'voucher_method' },
  },
  {
    name: 'PLUXE es voucher',
    input: { paymentMethod: 'PLUXE', settings: settingsAlways },
    expected: { kind: 'voucher', reason: 'voucher_method' },
  },
  {
    name: 'EDENRED es voucher',
    input: { paymentMethod: 'EDENRED', settings: settingsAlways },
    expected: { kind: 'voucher', reason: 'voucher_method' },
  },
  {
    name: 'TERMINAL + TUU con toggle ON => voucher del terminal',
    input: { paymentMethod: 'TERMINAL', terminalType: 'TUU', settings: { siiEmission: 'always', terminalsDte: { TUU: true } } },
    expected: { kind: 'voucher', reason: 'terminal_dte' },
  },
  {
    name: 'TERMINAL + TUU con toggle OFF => bloqueo antes de cobrar',
    input: { paymentMethod: 'TERMINAL', terminalType: 'TUU', settings: { siiEmission: 'always', terminalsDte: { TUU: false } } },
    expected: { kind: 'blocked', reason: 'blocked_terminal' },
  },
  {
    name: 'TERMINAL + TUU sin toggle usa el default declarado (true) => voucher',
    input: { paymentMethod: 'TERMINAL', terminalType: 'TUU', settings: settingsAlways },
    expected: { kind: 'voucher', reason: 'terminal_dte' },
  },
  {
    name: 'TERMINAL + alias legacy SumUp se normaliza a SumUp Solo => voucher',
    input: { paymentMethod: 'TERMINAL', terminalType: 'SumUp', settings: settingsAlways },
    expected: { kind: 'voucher', reason: 'terminal_dte' },
  },
  {
    name: 'TERMINAL + SumUp Solo con toggle OFF => bloqueo',
    input: { paymentMethod: 'TERMINAL', terminalType: 'SumUp Solo', settings: { siiEmission: 'always', terminalsDte: { 'SumUp Solo': false } } },
    expected: { kind: 'blocked', reason: 'blocked_terminal' },
  },
  {
    name: 'TERMINAL + alias legacy SumUp respeta toggle legacy OFF',
    input: { paymentMethod: 'TERMINAL', terminalType: 'SumUp', settings: { siiEmission: 'always', terminalsDte: { SumUp: false } } },
    expected: { kind: 'blocked', reason: 'blocked_terminal' },
  },
  {
    name: 'TERMINAL + SumUp Air no emite DTE => DTE propio',
    input: { paymentMethod: 'TERMINAL', terminalType: 'SumUp Air', settings: settingsAlways },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'TERMINAL + SumUp Air con toggle mal puesto en ON => igual DTE propio (no declarado no emite)',
    input: { paymentMethod: 'TERMINAL', terminalType: 'SumUp Air', settings: { siiEmission: 'always', terminalsDte: { 'SumUp Air': true } } },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'TERMINAL + Getnet con toggle ON => voucher',
    input: { paymentMethod: 'TERMINAL', terminalType: 'Getnet', settings: { siiEmission: 'always', terminalsDte: { Getnet: true } } },
    expected: { kind: 'voucher', reason: 'terminal_dte' },
  },
  {
    name: 'TERMINAL sin terminalType => DTE propio',
    input: { paymentMethod: 'TERMINAL', settings: settingsAlways },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'TERMINAL con terminal desconocido => DTE propio',
    input: { paymentMethod: 'TERMINAL', terminalType: 'Mercado Pago', settings: settingsAlways },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'método cambiado a EFECTIVO con terminalType TUU stale (toggle ON) => DTE, no salta SII',
    input: { paymentMethod: 'EFECTIVO', terminalType: 'TUU', settings: { siiEmission: 'always', terminalsDte: { TUU: true } } },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'método cambiado a EFECTIVO con terminalType TUU stale (toggle OFF) => DTE, no bloquea',
    input: { paymentMethod: 'EFECTIVO', terminalType: 'TUU', settings: { siiEmission: 'always', terminalsDte: { TUU: false } } },
    expected: { kind: 'dte', reason: 'sii' },
  },
  {
    name: 'voucher_only + EFECTIVO => voucher por modelo de negocio',
    input: { paymentMethod: 'EFECTIVO', settings: { siiEmission: 'voucher_only' } },
    expected: { kind: 'voucher', reason: 'business_no_sii' },
  },
  {
    name: 'voucher_only + JUNAEB => business_no_sii gana sobre voucher_method',
    input: { paymentMethod: 'JUNAEB', settings: { siiEmission: 'voucher_only' } },
    expected: { kind: 'voucher', reason: 'business_no_sii' },
  },
  {
    name: 'voucher_only + TERMINAL/TUU con toggle ON => business_no_sii gana sobre terminal_dte',
    input: { paymentMethod: 'TERMINAL', terminalType: 'TUU', settings: { siiEmission: 'voucher_only', terminalsDte: { TUU: true } } },
    expected: { kind: 'voucher', reason: 'business_no_sii' },
  },
  {
    name: 'voucher_only + TERMINAL/TUU con toggle OFF => blocked gana sobre business_no_sii',
    input: { paymentMethod: 'TERMINAL', terminalType: 'TUU', settings: { siiEmission: 'voucher_only', terminalsDte: { TUU: false } } },
    expected: { kind: 'blocked', reason: 'blocked_terminal' },
  },
]

describe('decideSiiEmission', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    expect(decideSiiEmission(input)).toEqual(expected)
  })

  it('normaliza el alias legacy de SumUp sin tocar hardware/types', () => {
    expect(normalizeTerminalType('SumUp')).toBe('SumUp Solo')
    expect(normalizeTerminalType('SumUp Solo')).toBe('SumUp Solo')
    expect(normalizeTerminalType('SumUp Air')).toBe('SumUp Air')
    expect(normalizeTerminalType(undefined)).toBeUndefined()
  })

  it('toda salida voucher tiene un motivo no-sii y toda salida blocked impide cobrar', () => {
    for (const { input } of cases) {
      const decision = decideSiiEmission(input)
      if (decision.kind === 'voucher') {
        expect(['voucher_method', 'terminal_dte', 'business_no_sii']).toContain(decision.reason)
      }
      if (decision.kind === 'blocked') {
        expect(decision.reason).toBe('blocked_terminal')
      }
    }
  })
})
