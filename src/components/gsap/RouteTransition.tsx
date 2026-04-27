"use client";

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { ensureGsapRegistered } from '@/lib/gsap'

ensureGsapRegistered()

/**
 * RouteTransition
 * Overlay sutil para dar sensación "premium" al navegar.
 * No bloquea interacción más que durante la animación.
 */
export default function RouteTransition() {
  const pathname = usePathname()
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const overlay = overlayRef.current
    const sheen = sheenRef.current
    if (!overlay || !sheen) return

    // Reset
    gsap.killTweensOf([overlay, sheen])
    gsap.set(overlay, { autoAlpha: 0, pointerEvents: 'none' })
    gsap.set(sheen, { xPercent: -120, autoAlpha: 0.9 })

    // Play
    const tl = gsap.timeline()
    tl.set(overlay, { autoAlpha: 1, pointerEvents: 'none' })
      .to(overlay, { autoAlpha: 1, duration: 0.08 })
      .to(sheen, { xPercent: 120, duration: 0.55, ease: 'power3.out' }, 0)
      .to(overlay, { autoAlpha: 0, duration: 0.18, ease: 'power2.out' }, 0.45)

    return () => { tl.kill() }
  }, [pathname])

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-0"
    >
      {/* Backdrop tint */}
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      {/* Sheen */}
      <div
        ref={sheenRef}
        className="absolute inset-y-0 -left-1/2 w-[140%] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/15"
        style={{ transform: 'skewX(-12deg)' }}
      />
    </div>
  )
}

