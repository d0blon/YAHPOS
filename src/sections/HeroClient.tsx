"use client";

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck, Percent, Clock, Sparkles, MousePointer2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ensureGsapRegistered } from '@/lib/gsap'
import { ecommerceConfig } from '@/config/ecommerce'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'

ensureGsapRegistered()

const features = ecommerceConfig.features.map((f, i) => {
  const icons = [Truck, Percent, Clock, ShoppingBag];
  return { icon: icons[i % icons.length], label: f.label, sublabel: f.sublabel };
});

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
  const visualRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { content } = useEditor();

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    // Initial State
    gsap.set('.hero-title-word', { y: 120, rotateX: -90, opacity: 0 });
    gsap.set('.hero-visual-container', { scale: 0.9, opacity: 0, rotateY: 20 });

    // Entrance sequence
    tl.fromTo('.hero-badge', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2 }
    )
    .to('.hero-title-word', {
      y: 0,
      rotateX: 0,
      opacity: 1,
      duration: 1.5,
      stagger: 0.1,
      ease: 'expo.out',
    }, "-=0.8")
    .fromTo('.hero-description', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2 },
      "-=1"
    )
    .fromTo('.hero-cta', 
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, stagger: 0.1, ease: 'back.out(1.7)' },
      "-=0.8"
    )
    .to('.hero-visual-container', {
      scale: 1,
      opacity: 1,
      rotateY: 0,
      duration: 2,
      ease: 'power4.out'
    }, "-=1.5")
    .fromTo(['.hero-stat-card'], 
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1, stagger: 0.2, ease: 'back.out(2)' },
      "-=0.5"
    );

    // Floating animations
    gsap.to('.hero-stat-card', {
      y: -15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.5
    });

    // Scroll Parallax Effects
    // Parallax using yPercent to avoid conflict with 'y' property used in entrance animation
    gsap.to('.hero-title-word', {
      scrollTrigger: {
        trigger: container.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
      yPercent: (i) => (i + 1) * 25, // Parallax movement using yPercent
      ease: 'none'
    });

    gsap.to('.hero-visual-container', {
      scrollTrigger: {
        trigger: container.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: 80,
      rotateX: 5,
      scale: 0.95,
      ease: 'none'
    });

    gsap.to('.hero-background-ornament', {
      scrollTrigger: {
        trigger: container.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: (i) => (i + 1) * 150,
      scale: 1.2,
      ease: 'none'
    });

  }, { scope: container });

  // 3D Parallax Effect on Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!container.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = container.current.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    
    setMousePos({ x, y });

    // Move visual elements with dampening
    gsap.to(visualRef.current, {
      rotateY: x * 20,
      rotateX: -y * 20,
      duration: 1.2,
      ease: 'power2.out'
    });

    gsap.to('.hero-background-ornament', {
      x: x * 60,
      y: y * 60,
      duration: 2.5,
      ease: 'power2.out'
    });
  };

  return (
    <section 
      ref={container} 
      onMouseMove={handleMouseMove}
      className="relative h-full flex items-center pt-10 pb-6 overflow-hidden bg-[#030712]"
    >
      {/* Spectacular Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="hero-background-ornament absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-blue-600/10 blur-[160px] rounded-full" />
        <div className="hero-background-ornament absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="hero-badge inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-3xl rounded-full mb-6 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <EditableText
                field="hero.badge"
                value={content.hero.badge}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80"
              />
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-[ clamp(4rem,8vw,8.5rem)] font-black leading-[0.85] tracking-tight mb-8 perspective-2000 text-white">
              <div className="overflow-hidden mb-2">
                <EditableText field="hero.titlePrimary" value={content.hero.titlePrimary} className="hero-title-word inline-block" />
              </div>
              <div className="overflow-hidden mb-2">
                <EditableText field="hero.titleAccent" value={content.hero.titleAccent} className="hero-title-word text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 inline-block drop-shadow-[0_0_30px_rgba(129,140,248,0.3)]" />
              </div>
              <div className="overflow-hidden">
                <EditableText field="hero.titleSecondary" value={content.hero.titleSecondary} className="hero-title-word inline-block" />
              </div>
            </h1>

            <EditableText
              field="hero.description"
              value={content.hero.description}
              as="p"
              className="hero-description text-lg md:text-xl text-gray-400 mb-10 max-w-xl font-medium leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto mb-12">
              <div className="hero-cta group">
                <Link href="/categoria/alimentos" className="relative inline-flex items-center justify-center w-full sm:w-auto px-10 py-5 bg-white text-black font-black text-lg rounded-[2rem] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                  <ShoppingBag className="w-6 h-6 mr-3" />
                  <EditableText field="hero.ctaPrimary" value={content.hero.ctaPrimary} />
                </Link>
              </div>
              <div className="hero-cta">
                <Link href="/ofertas" className="group inline-flex items-center justify-center w-full sm:w-auto px-10 py-5 bg-white/5 backdrop-blur-3xl text-white font-black text-lg rounded-[2rem] border border-white/10 transition-all hover:bg-white/10 active:scale-95">
                  <EditableText field="hero.ctaSecondary" value={content.hero.ctaSecondary} />
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-3 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="hero-features-grid grid grid-cols-2 md:grid-cols-4 gap-6 w-full border-t border-white/5 pt-8">
              {features.map((feature, idx) => (
                <div key={idx} className="hero-feature flex flex-col gap-2 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center transition-all duration-500 group-hover:bg-blue-600 group-hover:scale-110">
                    <feature.icon className="w-4 h-4 text-blue-400 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{feature.label}</h4>
                    <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">{feature.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - 3D Visual */}
          <div className="hidden lg:block lg:col-span-5 relative perspective-3000">
            <div ref={visualRef} className="hero-visual-container relative w-full h-[520px] preserve-3d">
              {/* Floating Decoration Elements */}
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
              
              {/* Main Image Layer */}
              <div className="relative z-10 w-full h-full rounded-[3.5rem] overflow-hidden shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] border border-white/10 group">
                <img 
                  src="/hero_ecommerce_premium_1777248177152.png" 
                  alt="Elite Experience" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                
                {/* Floating Stats UI */}
                <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between">
                   <div>
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Live Catalogue</p>
                      <p className="text-white text-5xl font-black tracking-tighter leading-none">{displayTotal}<span className="text-blue-500">+</span></p>
                   </div>
                   <div className="flex flex-col items-end">
                      <div className="flex gap-1 mb-3">
                        {[1,2,3,4].map(i => <div key={i} className={`w-1 h-1 rounded-full ${i===2 ? 'bg-blue-500' : 'bg-white/20'}`} />)}
                      </div>
                      <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-[9px] font-black tracking-widest px-3 py-1.5">ELITE TIER</Badge>
                   </div>
                </div>
              </div>

              {/* Interaction Overlay Cards */}
              <div ref={card1Ref} className="hero-stat-card absolute -top-8 -right-8 z-20 glass-card p-5 rounded-[2rem] border-white/20 bg-white/10 backdrop-blur-3xl shadow-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                       <Clock className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Delivery Time</p>
                       <p className="text-lg font-black text-white leading-none mt-1">45 MINS</p>
                    </div>
                 </div>
              </div>

              <div ref={card2Ref} className="hero-stat-card absolute bottom-20 -left-12 z-20 glass-card p-5 rounded-[2rem] border-white/20 bg-white/10 backdrop-blur-3xl shadow-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                       <Sparkles className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Customer Score</p>
                       <p className="text-lg font-black text-white leading-none mt-1">4.9/5.0</p>
                    </div>
                 </div>
              </div>
              
              {/* Decorative Floating Icon */}
              <div className="absolute top-1/2 -right-6 w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] animate-bounce-slow">
                 <MousePointer2 className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Bottom Transition Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
