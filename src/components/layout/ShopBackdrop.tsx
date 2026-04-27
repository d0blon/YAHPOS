"use client";

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

ensureGsapRegistered()

export default function ShopBackdrop() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Slow ambient motion (subtle, no nausea)
    const a = root.current?.querySelector<HTMLElement>('[data-orb="a"]')
    const b = root.current?.querySelector<HTMLElement>('[data-orb="b"]')
    const c = root.current?.querySelector<HTMLElement>('[data-orb="c"]')

    if (a) gsap.to(a, { x: 40, y: -30, duration: 10, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    if (b) gsap.to(b, { x: -35, y: 28, duration: 12, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.6 })
    if (c) gsap.to(c, { x: 25, y: 22, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 })
  }, { scope: root })

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Soft base gradient for both themes - Strictly Indigo/Purple */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(149,0,255,0.03),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(149,0,255,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(30,0,51,0.2),transparent_70%)]" />

      {/* Orbs - Unified Patagonia Palette */}
      <div data-orb="a" className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-patagonia-600/10 blur-[100px] dark:bg-patagonia-500/15" />
      <div data-orb="b" className="absolute top-[35%] -left-32 h-[520px] w-[520px] rounded-full bg-blue-500/5 blur-[120px] dark:bg-patagonia-700/20" />
      <div data-orb="c" className="absolute -bottom-40 right-[10%] h-[560px] w-[560px] rounded-full bg-purple-500/5 blur-[110px] dark:bg-patagonia-900/30" />

      {/* CSS noise (no asset) */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)',
        }}
      />
    </div>
  )
}

