"use client";

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck, Percent, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Magnetic from '@/components/ui/magnetic';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

const features = [
  { icon: Truck, label: 'Envío Gratis', sublabel: 'En compras +$30.000' },
  { icon: Percent, label: 'Ofertas Diarias', sublabel: 'Precios competitivos' },
  { icon: Clock, label: 'Entrega Rápida', sublabel: 'Mismo día' },
  { icon: ShoppingBag, label: 'Calidad Premium', sublabel: 'Selección fresca' },
]

interface HeroClientProps {
  displayTotal: number;
  countAlimentos: number;
  countBebidas: number;
  countFrescos: number;
}

export default function HeroClient({
  displayTotal,
  countAlimentos,
  countBebidas,
  countFrescos,
}: HeroClientProps) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // Background orbs animation
    gsap.to('.orb-1', {
      x: 'random(-50, 50)',
      y: 'random(-50, 50)',
      duration: 8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    
    gsap.to('.orb-2', {
      x: 'random(-50, 50)',
      y: 'random(-50, 50)',
      duration: 10,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 1,
    });

    // Entrance animations
    tl.fromTo('.hero-badge', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 }
    )
    .fromTo('.hero-title-word', 
      { y: 80, opacity: 0, rotateX: -45 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.1, transformOrigin: "0% 50% -50" },
      "-=0.6"
    )
    .fromTo('.hero-description', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1 },
      "-=0.8"
    )
    .fromTo('.hero-cta', 
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
      "-=0.6"
    )
    .fromTo('.hero-feature', 
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
      "-=0.4"
    )
    .fromTo('.hero-visual', 
      { scale: 0.9, opacity: 0, filter: 'blur(10px)' },
      { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'power3.out' },
      "-=1.2"
    );

  }, { scope: container });

  return (
    <section ref={container} className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden bg-background">
      {/* Impeccable Spatial Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,var(--color-patagonia-100),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,var(--color-patagonia-900),transparent_50%)] opacity-50" />
        <div className="orb-1 absolute top-[10%] right-[10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-corporate-blue/10 dark:bg-corporate-blue/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="orb-2 absolute bottom-[10%] left-[5%] w-[35vw] h-[35vw] max-w-[500px] max-h-[500px] rounded-full bg-purple-500/10 dark:bg-purple-500/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 dark:bg-white/10 backdrop-blur-md rounded-full mb-8 border border-foreground/10 dark:border-white/10">
              <Sparkles className="w-4 h-4 text-corporate-blue dark:text-accent-yellow animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/80 dark:text-white/90">
                Experiencia Premium
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tight mb-8 perspective-1000">
              <div className="overflow-hidden flex flex-wrap gap-x-4">
                <span className="hero-title-word text-foreground inline-block">Tu</span>
                <span className="hero-title-word text-foreground inline-block">Supermercado</span>
              </div>
              <div className="overflow-hidden flex flex-wrap gap-x-4">
                <span className="hero-title-word text-transparent bg-clip-text bg-gradient-to-r from-corporate-blue to-purple-500 dark:from-accent-yellow dark:to-orange-400 inline-block">
                  Online
                </span>
                <span className="hero-title-word text-foreground inline-block">de Confianza</span>
              </div>
            </h1>

            <p className="hero-description text-lg md:text-xl text-foreground/60 dark:text-white/60 mb-10 max-w-xl font-medium leading-relaxed">
              Descubre una nueva forma de hacer tus compras. Productos frescos seleccionados a mano, 
              precios competitivos y entrega rápida directamente a tu puerta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16">
              <Magnetic>
                <div className="hero-cta">
                  <Link href="/categoria/alimentos" className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-foreground dark:bg-white text-background dark:text-gray-950 font-bold rounded-2xl overflow-hidden transition-transform active:scale-95">
                    <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    <span className="relative">Comenzar Pedido</span>
                  </Link>
                </div>
              </Magnetic>
              <Magnetic>
                <div className="hero-cta">
                  <Link href="/ofertas" className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-transparent text-foreground dark:text-white font-bold rounded-2xl border-2 border-foreground/10 dark:border-white/20 hover:bg-foreground/5 dark:hover:bg-white/5 transition-all active:scale-95">
                    Ver Ofertas
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </Magnetic>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl">
              {features.map((feature, idx) => (
                <div key={idx} className="hero-feature flex flex-col gap-2">
                  <div className="w-10 h-10 rounded-xl bg-corporate-blue/10 dark:bg-white/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-corporate-blue dark:text-accent-yellow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground dark:text-white">{feature.label}</h4>
                    <p className="text-xs text-foreground/60 dark:text-white/60">{feature.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Abstract Visual */}
          <div className="hidden lg:block lg:col-span-5 relative h-full min-h-[600px]">
            <div className="hero-visual absolute inset-0 flex items-center justify-center">
              {/* Premium Glass Card replacing the nested cards anti-pattern */}
              <div className="relative w-full aspect-[4/5] max-w-[420px] rounded-[2.5rem] bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl p-8 flex flex-col overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-corporate-blue/20 to-purple-500/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/3" />
                
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="w-16 h-16 bg-gradient-to-br from-corporate-blue to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-corporate-blue/30 mb-8">
                      <ShoppingBag className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-5xl font-black text-foreground dark:text-white tracking-tighter mb-2">
                      {displayTotal}
                    </h3>
                    <p className="text-sm font-bold uppercase tracking-widest text-foreground/60 dark:text-white/60">
                      Productos en Catálogo
                    </p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { name: 'Alimentos', count: countAlimentos },
                      { name: 'Bebidas', count: countBebidas },
                      { name: 'Frescos', count: countFrescos }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-4 border-b border-foreground/5 dark:border-white/5 last:border-0 group cursor-pointer">
                        <span className="font-bold text-foreground/80 dark:text-white/80 group-hover:text-corporate-blue dark:group-hover:text-accent-yellow transition-colors">
                          {item.name}
                        </span>
                        <span className="font-mono text-sm font-medium text-foreground/50 dark:text-white/50">
                          {String(item.count).padStart(3, '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
