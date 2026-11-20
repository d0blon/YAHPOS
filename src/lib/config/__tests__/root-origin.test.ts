import { getRootOrigin, ROOT_ORIGIN_ENV_VAR } from '../root-origin'

const originalValue = process.env[ROOT_ORIGIN_ENV_VAR]

describe('getRootOrigin', () => {
  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ROOT_ORIGIN_ENV_VAR]
    } else {
      process.env[ROOT_ORIGIN_ENV_VAR] = originalValue
    }
  })

  it('devuelve el origin configurado cuando es HTTP(S) válido', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'https://root.example.test'
    expect(getRootOrigin()).toBe('https://root.example.test')
  })

  it('falla cerrado si la variable falta', () => {
    delete process.env[ROOT_ORIGIN_ENV_VAR]
    expect(() => getRootOrigin()).toThrow(ROOT_ORIGIN_ENV_VAR)
  })

  it.each([
    '',
    '   ',
    'ftp://root.example.test',
    'not-a-url',
    'https://root.example.test/base',
    'https://user:pass@root.example.test',
  ])('falla cerrado si la variable es inválida: "%s"', (value) => {
    process.env[ROOT_ORIGIN_ENV_VAR] = value
    expect(() => getRootOrigin()).toThrow(ROOT_ORIGIN_ENV_VAR)
  })
})
