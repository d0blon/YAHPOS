'use client'

import { motion, Variants } from 'framer-motion'
import { Flame, ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function BestSellersSlide() {
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

  const mockProducts = [
    { id: 1, name: 'Pan Amasado', rating: 5, price: '$2.000 / kg', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop' },
    { id: 2, name: 'Leche Entera 1L', rating: 4.8, price: '$1.100', img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=400&auto=format&fit=crop' },
    { id: 3, name: 'Huevos Docena', rating: 4.9, price: '$3.500', img: 'https://images.unsplash.com/photo-1506976785307-8732e854ad02?q=80&w=400&auto=format&fit=crop' },
    { id: 4, name: 'Queso Mantecoso', rating: 5, price: '$4.500 / 1/2kg', img: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400&auto=format&fit=crop' },
  ]

  return (
    <section id="bestsellers" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-yellow-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <div className="grid lg:grid-cols-3 gap-12 items-center">
          
          <motion.div 
            className="flex flex-col lg:pr-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            <motion.div variants={itemVariants} className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md">
                <Flame className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">
                  Top Ventas
                </span>
              </div>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-white mb-6 uppercase"
            >
              Favoritos del <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">Público</span>
            </motion.h2>
            
            <motion.p variants={itemVariants} className="text-gray-400 text-lg mb-8">
              Los productos más elegidos por nuestra comunidad. Calidad comprobada y frescura garantizada en tu mesa todos los días.
            </motion.p>

            <motion.div variants={itemVariants}>
              <Link href="/top-ventas" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md group">
                <span>Ver Catálogo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-yellow-400" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="lg:col-span-2 grid grid-cols-2 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
          >
            {mockProducts.map((product, idx) => (
              <motion.div 
                key={product.id} 
                variants={itemVariants}
                className={`group relative bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 ${idx % 2 === 1 ? 'mt-8 md:mt-12' : ''}`}
              >
                <div className="relative h-40 md:h-48 w-full overflow-hidden bg-white/5">
                  <Image src={product.img} alt={product.name} fill className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-bold text-white">{product.rating}</span>
                  </div>
                </div>
                <div className="p-4 md:p-5 relative z-10">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{product.name}</h3>
                  <div className="text-yellow-400 font-black">{product.price}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
