"use client";

import { useRef } from 'react';
import { Box, ArrowRight, Zap, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, Variants } from 'framer-motion';

const samplePacks = [
  {
    id: 1,
    title: "Pack Super 8",
    description: "3 unidades de pura energía para tu día",
    price: 1000,
    tag: "3x1000",
    color: "from-amber-400 to-orange-600",
    icon: ShoppingBag
  },
  {
    id: 2,
    title: "Combo Desayuno",
    description: "Pan fresco + Leche entera + Mermelada artesanal",
    price: 4500,
    tag: "AHORRO 20%",
    color: "from-brand-400 to-brand-600",
    icon: Sparkles
  },
  {
    id: 3,
    title: "Pack Limpieza",
    description: "Detergente concentrado + Suavizante premium",
    price: 8990,
    tag: "OFERTA ELITE",
    color: "from-emerald-400 to-teal-600",
    icon: Box
  }
];

export default function PackSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.165, 0.84, 0.44, 1], // power4.out approx
      },
    },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 100, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 1.2,
        ease: [0.175, 0.885, 0.32, 1.275], // back.out approx
      },
    },
  };

  return (
    <section 
      ref={containerRef}
      className="relative h-full py-10 flex items-center bg-[#050505] overflow-hidden"
    >
      {/* Premium Background Visuals */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-64 -mb-64" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div 
          ref={headerRef} 
          className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-3xl">
             <motion.div variants={headerVariants} className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-full mb-8 border border-amber-500/20">
                <Box className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">Ahorro Inteligente</span>
              </motion.div>
              <motion.h2 variants={headerVariants} className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[0.8] mb-8">
                LOS MEJORES <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500">PACKS</span>
              </motion.h2>
              <motion.p variants={headerVariants} className="text-xl text-gray-500 max-w-xl font-medium leading-relaxed">
                Diseñamos combinaciones exclusivas para que ahorres más en tus productos favoritos. Calidad YAHPOS! garantizada.
              </motion.p>
          </div>
          <motion.div variants={headerVariants}>
            <Button variant="ghost" className="text-white font-black tracking-[0.2em] hover:bg-white/5 px-10 h-20 rounded-[2rem] border border-white/5 group">
              EXPLORAR TODA LA SELECCIÓN
              <ArrowRight className="w-6 h-6 ml-4 group-hover:translate-x-3 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Packs Grid */}
        <motion.div 
          className="packs-grid grid md:grid-cols-3 gap-8 lg:gap-12"
          variants={cardContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {samplePacks.map((pack) => (
            <motion.div 
              key={pack.id} 
              variants={cardVariants}
              className="group relative rounded-[3.5rem] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/[0.05] overflow-hidden transition-all duration-700 hover:border-white/20 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
            >
              {/* Image / Icon Container */}
              <div className="aspect-[4/5] relative overflow-hidden p-2">
                <div className="absolute inset-0 m-4 rounded-[3rem] overflow-hidden bg-black/40">
                  {/* Premium Image Placement */}
                  <img 
                    src="/grocery_packs_premium_1777270721763.png" 
                    alt={pack.title}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${pack.color} mix-blend-overlay opacity-40`} />
                  
                  {/* Floating Tag */}
                  <div className="absolute top-6 left-6 z-10">
                     <div className="bg-white text-black px-6 py-2 rounded-full font-black text-[10px] tracking-widest shadow-2xl flex items-center gap-2">
                        <Zap className="w-3 h-3 fill-current" />
                        {pack.tag}
                     </div>
                  </div>
                  
                  {/* Icon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <pack.icon className="w-24 h-24 text-white drop-shadow-2xl animate-float" />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-12 pt-4 relative">
                <h3 className="text-3xl font-black text-white mb-3 tracking-tight group-hover:text-amber-400 transition-colors">{pack.title}</h3>
                <p className="text-gray-500 font-medium text-lg mb-10 leading-snug line-clamp-2">{pack.description}</p>
                
                <div className="flex items-center justify-between border-t border-white/5 pt-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Precio Pack</span>
                    <p className="text-5xl font-black text-white tracking-tighter">
                      ${pack.price.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <button className="w-20 h-20 rounded-[2rem] bg-white text-black flex items-center justify-center transition-all hover:scale-110 hover:bg-amber-400 active:scale-95 shadow-2xl group/btn">
                    <Zap className="w-9 h-9 fill-current group-hover/btn:scale-125 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Premium Glow on Hover */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
