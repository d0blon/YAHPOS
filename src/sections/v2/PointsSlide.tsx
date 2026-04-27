'use client'

import { motion, Variants } from 'framer-motion'
import { Gift, Star, ShieldCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PointsSlide() {
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

  const benefits = [
    { icon: Gift, title: 'Recompensas Exclusivas', desc: 'Canjea puntos por productos gratis y descuentos especiales.' },
    { icon: Star, title: 'Acumulación Automática', desc: 'Suma puntos con cada compra dictando tu RUT en caja.' },
    { icon: ShieldCheck, title: 'Niveles Premium', desc: 'Asciende a Plus o Élite para obtener beneficios únicos.' },
  ]

  return (
    <section id="points" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-[10%] left-[20%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <div className="max-w-5xl mx-auto w-full">
          
          <motion.div 
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            <motion.div variants={itemVariants} className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 backdrop-blur-md">
                <Gift className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                  Beneficios Premium
                </span>
              </div>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-white mb-6 uppercase"
            >
              Club de <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">Puntos</span>
            </motion.h2>
            
            <motion.p variants={itemVariants} className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl">
              Únete gratis y empieza a ganar. Cada peso cuenta para conseguir tus productos favoritos totalmente gratis o con descuentos increíbles.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6 mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            {benefits.map((benefit, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 text-center flex flex-col items-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-8 h-8 text-fuchsia-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.1 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/registro" className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest overflow-hidden transition-transform hover:scale-105 active:scale-95">
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Unirme Ahora</span>
              <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link href="/login" className="inline-flex items-center justify-center px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md">
              Iniciar Sesión
            </Link>
          </motion.div>
          
        </div>
      </div>
    </section>
  )
}
