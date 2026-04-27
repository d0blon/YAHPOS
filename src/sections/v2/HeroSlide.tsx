'use client'

import { motion, Variants } from 'framer-motion'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'

export default function HeroSlide() {
  const { content } = useEditor()
  const hero = content.hero

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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

  return (
    <section className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-pink-500/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center h-full">
          
          {/* Text Content */}
          <motion.div 
            className="flex flex-col justify-center max-w-2xl"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <EditableText
                  field="hero.badge"
                  value={hero.badge}
                  className="text-xs font-bold uppercase tracking-widest text-blue-200"
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-white mb-6 uppercase"
            >
              {hero.titlePrimary && (
                <EditableText field="hero.titlePrimary" value={hero.titlePrimary} className="block" as="span" />
              )}
              {hero.titleAccent && (
                <EditableText
                  field="hero.titleAccent"
                  value={hero.titleAccent}
                  as="span"
                  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 block"
                />
              )}
              {hero.titleSecondary && (
                <EditableText field="hero.titleSecondary" value={hero.titleSecondary} className="block" as="span" />
              )}
            </motion.h1>

            {/* Description */}
            <motion.div variants={itemVariants}>
              <EditableText
                field="hero.description"
                value={hero.description}
                as="p"
                className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-lg mb-10"
              />
            </motion.div>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="#categories" 
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest overflow-hidden transition-transform hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <EditableText field="hero.ctaPrimary" value={hero.ctaPrimary} className="relative" />
                <ShoppingBag className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="#offers" 
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md"
              >
                <EditableText field="hero.ctaSecondary" value={hero.ctaSecondary} />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-purple-400" />
              </Link>
            </motion.div>
            
            {/* Trust Indicators */}
            <motion.div variants={itemVariants} className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#030712] bg-gray-800 overflow-hidden relative">
                    <Image src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" fill sizes="40px" className="object-cover opacity-80" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">+2,000 clientes felices</span>
              </div>
            </motion.div>

          </motion.div>

          {/* Visual Content */}
          <motion.div 
            className="hidden lg:flex relative h-full w-full items-center justify-center"
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <div className="relative w-full aspect-square max-w-md">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-purple-500/30 rounded-full blur-[80px] animate-pulse duration-700" />
              <div className="absolute inset-4 rounded-[3rem] border border-white/20 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="h-12 border-b border-white/10 flex items-center px-6 gap-2 bg-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 p-8 flex flex-col justify-between relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg transform rotate-12 self-end mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
                  <div className="w-32 h-16 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md transform -rotate-6 self-start mb-auto" />
                  <div className="mt-auto space-y-3">
                    <div className="h-4 w-3/4 bg-white/20 rounded-full" />
                    <div className="h-4 w-1/2 bg-white/10 rounded-full" />
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
