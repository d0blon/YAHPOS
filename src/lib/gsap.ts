import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

let registered = false

export function ensureGsapRegistered() {
  if (registered) return
  // Only register in the browser
  if (typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger, useGSAP)
  registered = true
}

export function toArray<T extends Element = Element>(
  selector: string,
  scope?: Element | null
): T[] {
  if (typeof window === 'undefined') return []
  const ctx = scope ?? document
  return Array.from(ctx.querySelectorAll(selector)) as T[]
}

