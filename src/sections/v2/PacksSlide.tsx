'use client'

import { motion, Variants } from 'framer-motion'
import { PackageOpen, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function PacksSlide() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  }

  const mockPacks = [
    { 
      id: 1, 
      name: 'Pack Desayuno', 
      price: '$5.990',
      oldPrice: '$7.500',
      items: ['Pan Especial 1kg', 'Mantequilla 250g', 'Café 100g'],
      img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=400&auto=format&fit=crop'
    },
    { 
      id: 2, 
      name: 'Promo 3x2 Super Ocho', 
      price: '$1.000',
      oldPrice: '$1.500',
      items: ['3x Super Ocho Clásico'],
      img: 'https://images.unsplash.com/photo-1511381939415-e440c05216e2?q=80&w=400&auto=format&fit=crop'
    },
  ]

  return (
    <section id="packs" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[10%] left-[10%] w-[30vw] h-[30vw] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <motion.div 
          className="flex flex-col items-center text-center mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
        >
          <motion.div variants={itemVariants} className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
              <PackageOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Lleva más, paga menos
              </span>
            </div>
          </motion.div>

          <motion.h2 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-white mb-4 uppercase"
          >
            Packs & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Combos</span>
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-gray-400 max-w-xl mx-auto text-lg">
            Combina tus productos favoritos y ahorra. Opciones exclusivas creadas para ti con stock limitado.
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
        >
          {mockPacks.map((pack) => (
            <motion.div 
              key={pack.id} 
              variants={itemVariants}
              className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col md:flex-row hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
            >
              <div className="relative h-48 md:h-auto md:w-2/5 overflow-hidden bg-white/5">
                <Image src={pack.img} alt={pack.name} fill className="object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-110 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#030712] opacity-0 md:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent opacity-80 md:opacity-0" />
              </div>
              
              <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">{pack.name}</h3>
                
                <div className="flex flex-col gap-2 mb-6 text-sm text-gray-400">
                  {pack.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <span className="block text-sm text-gray-500 line-through mb-1">{pack.oldPrice}</span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{pack.price}</span>
                  </div>
                  <button className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
