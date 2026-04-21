import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

export function calculateDiscount(originalPrice: number, discountPercentage: number): number {
  return Math.round(originalPrice * (1 - discountPercentage / 100))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function cleanRut(rut: string): string {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : ''
}

export function validateRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') return false
  const cleaned = cleanRut(rut)
  if (cleaned.length < 2) return false
  
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)
  
  let sum = 0
  let multiplier = 2
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  
  const expectedDv = 11 - (sum % 11)
  let dvStr = ''
  if (expectedDv === 11) dvStr = '0'
  else if (expectedDv === 10) dvStr = 'K'
  else dvStr = expectedDv.toString()
  
  return dvStr === dv
}

export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut)
  if (!cleaned) return ''
  
  const dv = cleaned.slice(-1)
  const body = cleaned.slice(0, -1)
  
  let result = ''
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      result = '.' + result
    }
    result = body[i] + result
  }
  
  return body ? `${result}-${dv}` : dv
}
