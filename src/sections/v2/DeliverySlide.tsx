'use client'

import { motion, Variants } from 'framer-motion'
import { Truck, MapPin, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function DeliverySlide() {
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

  const features = [
    { icon: MapPin, text: 'Llegamos a todo el radio urbano en menos de 45 min' },
    { icon: Clock, text: 'Pedidos desde las 09:00 hasta las 22:00 hrs' },
    { icon: Truck, text: 'Despacho gratis en compras sobre $15.000' },
  ]

  return (
    <section id="delivery" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-[0%] right-[10%] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center h-full">
          
          <motion.div 
            className="flex flex-col justify-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                  Despacho Rápido
                </span>
              </div>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] text-white mb-6 uppercase"
            >
              Del local a tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Puerta</span>
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-lg mb-10"
            >
              No salgas de casa. Nosotros te llevamos todo lo que necesitas con la misma calidad y frescura de siempre.
            </motion.p>

            <motion.div variants={itemVariants} className="space-y-4 mb-10">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300 font-medium">{feature.text}</span>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link 
                href="/delivery" 
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest overflow-hidden transition-transform hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">Pedir Ahora</span>
                <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="hidden lg:flex relative h-full w-full items-center justify-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-lg">
              {/* Abstract Map Graphic */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-[3rem] blur-2xl" />
              <div className="relative aspect-square rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl p-8 flex flex-col justify-center items-center overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                {/* Simulated delivery route animation */}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center absolute top-1/4 left-1/4 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                    <StoreIcon className="w-6 h-6 text-indigo-400" />
                  </div>
                  
                  {/* Dashed line */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <motion.path 
                      d="M 30,30 Q 50,20 70,70" 
                      fill="none" 
                      stroke="rgba(96,165,250,0.5)" 
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </svg>

                  <motion.div 
                    className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center absolute shadow-[0_0_30px_rgba(59,130,246,0.8)] z-20"
                    animate={{ 
                      top: ['25%', '65%'],
                      left: ['25%', '65%']
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut'
                    }}
                  >
                    <MapPin className="w-6 h-6 text-white" />
                  </motion.div>
                  
                  <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/20 flex items-center justify-center absolute bottom-1/4 right-1/4">
                    <HomeIcon className="w-6 h-6 text-white/50" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

function StoreIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function HomeIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
