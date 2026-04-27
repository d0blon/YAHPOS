'use client'

import { motion, Variants } from 'framer-motion'
import { Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function OffersSlide() {
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

  const mockOffers = [
    { id: 1, name: 'Bebida Cola 3L', discount: '30%', price: '$1.990', oldPrice: '$2.850', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop' },
    { id: 2, name: 'Galletas Chocolate', discount: '2x1', price: '$1.500', oldPrice: '$3.000', img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=400&auto=format&fit=crop' },
    { id: 3, name: 'Café Instantáneo', discount: '25%', price: '$3.490', oldPrice: '$4.650', img: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=400&auto=format&fit=crop' },
  ]

  return (
    <section id="offers" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#030712]">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-red-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
              <Tag className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-300">
                Promociones Exclusivas
              </span>
            </div>
          </motion.div>

          <motion.h2 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-white mb-4 uppercase"
          >
            Ofertas de <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Locura</span>
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-gray-400 max-w-xl mx-auto text-lg">
            Aprovecha nuestros descuentos semanales. Stock limitado por promoción.
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
        >
          {mockOffers.map((offer) => (
            <motion.div 
              key={offer.id} 
              variants={itemVariants}
              className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 flex flex-col"
            >
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-red-500 text-white font-black px-3 py-1 rounded-full text-sm shadow-lg shadow-red-500/30 transform rotate-3 group-hover:rotate-6 transition-transform">
                  {offer.discount}
                </div>
              </div>
              <div className="relative h-48 w-full overflow-hidden bg-white/5">
                <Image src={offer.img} alt={offer.name} fill className="object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-110 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent opacity-80" />
              </div>
              <div className="p-6 flex-1 flex flex-col relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">{offer.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">{offer.price}</span>
                  <span className="text-sm text-gray-500 line-through">{offer.oldPrice}</span>
                </div>
                <button className="mt-auto w-full py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-red-500 hover:text-white transition-colors">
                  Agregar al Carrito
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
        >
          <Link href="/ofertas" className="inline-flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest hover:text-red-300 transition-colors group">
            Ver todas las ofertas <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
