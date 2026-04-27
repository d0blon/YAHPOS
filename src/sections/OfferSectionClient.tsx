"use client";

import { useRef } from 'react';
import { Percent, ArrowRight, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';
import { motion, Variants } from 'framer-motion';

interface OfferSectionProps {
  products: Product[];
}

export default function OfferSection({ products }: OfferSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const offerProducts = products.filter(p => p.originalPrice && p.originalPrice > p.price).slice(0, 4);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 1.2,
        ease: [0.19, 1, 0.22, 1], // expoOut
      },
    },
  };

  if (offerProducts.length === 0) return null;

  return (
    <section ref={containerRef} className="relative h-full py-10 flex items-center bg-[#050505] overflow-hidden">
      {/* Background Glow - More intense for premium feel */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-red-600/10 blur-[150px] rounded-full -mr-64 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-600/5 blur-[120px] rounded-full -ml-32 -mb-32" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10 w-full">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-500/10 rounded-full mb-6 border border-red-500/20">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Ofertas de la Semana</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
              ZONA DE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">OFERTAS</span>
            </h2>
          </div>
          <Button variant="ghost" className="text-white font-black tracking-widest hover:bg-white/5 px-8 h-16 rounded-2xl group">
            VER TODO EL OUTLET
            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>

        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {offerProducts.map((product) => (
            <motion.div key={product.id} variants={cardVariants} className="relative group">
              {/* Custom Badge for the section */}
              <div className="absolute -top-4 -left-4 z-20 bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-black text-xs shadow-[0_10px_20px_rgba(220,38,38,0.4)] rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500">
                -{Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
              </div>
              
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
