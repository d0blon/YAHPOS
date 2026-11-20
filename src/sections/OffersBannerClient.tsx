"use client";

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, Sparkles, Truck, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered, toArray } from '@/lib/gsap'

ensureGsapRegistered()

export default function OffersBannerClient({ displayDiscount }: { displayDiscount: number }) {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const cards = toArray('.offers-card', container.current)

    cards.forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
        },
        y: 60,
        opacity: 0,
        duration: 1.5,
        ease: 'expo.out',
      });
      
      const img = card.querySelector('.floating-img');
      if (img) {
        gsap.to(img, {
          y: -20,
          rotate: 5,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    });
  }, { scope: container })

  return (
    <section ref={container} className="py-40 bg-black relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[50vw] h-[50vw] bg-brand-accent-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-brand-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Main Featured Offer - 8 Columns */}
          <div className="offers-card lg:col-span-8 relative overflow-hidden rounded-[4rem] bg-gray-900 group min-h-[600px] flex flex-col justify-end p-12 md:p-20 border border-white/5">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0 transition-transform duration-1000 group-hover:scale-105">
              <Image 
                src="/hero_ecommerce_premium_1777248177152.png" 
                alt="Elite Offers" 
                fill 
                className="object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Badge className="bg-brand-accent-600 text-white font-black px-6 py-2 rounded-full text-[10px] tracking-[0.3em] shadow-2xl shadow-brand-accent-600/40">
                  FLASH SALE
                </Badge>
                <div className="flex items-center gap-2 text-brand-accent-400">
                  <Flame className="w-4 h-4 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Activo Ahora</span>
                </div>
              </div>

              <h3 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.8] uppercase">
                HASTA <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent-400 to-brand-400">{displayDiscount}%</span> <br />
                RESERVADO
              </h3>
              
              <p className="text-xl text-gray-400 mb-12 max-w-xl font-medium leading-relaxed">
                Accede a nuestra bodega privada con descuentos exclusivos para miembros Plus. 
                Productos seleccionados a mano por expertos australes.
              </p>

              <div className="flex flex-wrap items-center gap-8">
                <Link href="/productos">
                  <Button className="h-20 px-12 rounded-[2rem] bg-white text-black font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/5 group/btn">
                    EXPLORAR BODEGA
                    <ArrowRight className="w-6 h-6 ml-4 group-hover/btn:translate-x-3 transition-transform" />
                  </Button>
                </Link>

                <div className="flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-xl">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-brand-accent-400 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expira en</span>
                    <div className="flex gap-3 font-black text-2xl text-white tracking-tighter">
                      <span>23h</span>
                      <span className="opacity-30">:</span>
                      <span>45m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Card - 4 Columns */}
          <div className="lg:col-span-4 flex flex-col gap-10">
            
            {/* Free Shipping Card */}
            <div className="offers-card flex-1 relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand-accent-600 to-brand-800 p-12 flex flex-col justify-between group transition-all duration-500 hover:shadow-2xl hover:shadow-blue-600/20 border border-white/10">
              <Truck className="floating-img absolute -right-10 -top-10 w-48 h-48 text-white/10 rotate-[-15deg] pointer-events-none" />
              
              <div>
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 mb-8 font-black uppercase tracking-[0.2em] px-4 py-1 text-[10px]">
                  ENVÍO ELITE
                </Badge>
                <h3 className="text-4xl font-black text-white mb-6 tracking-tighter leading-tight uppercase">
                  LOGÍSTICA <br /> SIN LÍMITES
                </h3>
                <p className="text-white/70 font-medium text-lg leading-relaxed">
                  Envío prioritario gratuito en todos tus pedidos sobre $30.000.
                </p>
              </div>

              <Link href="/envios" className="mt-8">
                <Button variant="ghost" className="text-white font-black uppercase tracking-widest p-0 hover:bg-transparent hover:translate-x-3 transition-all">
                  Saber más <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </Link>
            </div>

            {/* Loyalty Card */}
            <div className="offers-card flex-1 relative overflow-hidden rounded-[3rem] bg-white/5 border border-white/10 p-12 flex flex-col justify-between group transition-all duration-500 hover:bg-white/[0.08]">
              <Sparkles className="floating-img absolute -right-8 -bottom-8 w-40 h-40 text-brand-accent-500/10 pointer-events-none" />

              <div>
                <Badge className="bg-brand-accent-600 text-white mb-8 font-black uppercase tracking-[0.2em] px-4 py-1 text-[10px]">
                  MEMBRESÍA
                </Badge>
                <h3 className="text-4xl font-black text-white mb-6 tracking-tighter leading-tight uppercase">
                  CLUB <br /> AUSTRAL
                </h3>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  Acumula puntos en cada compra y canjéalos por productos exclusivos.
                </p>
              </div>

              <Link href="/perfil" className="mt-8">
                <Button variant="ghost" className="text-white font-black uppercase tracking-widest p-0 hover:bg-transparent hover:translate-x-3 transition-all">
                  Unirse <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
