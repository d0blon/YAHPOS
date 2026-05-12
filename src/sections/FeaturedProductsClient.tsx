'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/shop/ProductCard';
import type { Product } from '@/types';
import { motion, Variants } from 'framer-motion';

interface FeaturedProductsClientProps {
  products: Product[];
}

export default function FeaturedProductsClient({ products }: FeaturedProductsClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.19, 1, 0.22, 1], // expoOut
      },
    },
  };

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
    hidden: { opacity: 0, y: 100, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 1.5,
        ease: [0.165, 0.84, 0.44, 1], // power4.out approx
      },
    },
  };

  return (
    <section ref={containerRef} className="relative h-full py-10 flex flex-col justify-center bg-white dark:bg-[#030303] overflow-hidden">
      {/* Dynamic Mesh Background Overlay */}
      <div className="absolute inset-0 opacity-40 dark:opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,rgba(254,204,27,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div 
          className="section-header flex flex-col md:flex-row md:items-end md:justify-between gap-12 mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={headerVariants} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-[2px] bg-corporate-blue dark:bg-accent-yellow" />
              <span className="text-sm font-black uppercase tracking-[0.3em] text-corporate-blue dark:text-accent-yellow">
                Selección Exclusiva
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-[0.9] mb-8">
              MÁS QUE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-corporate-blue via-purple-500 to-accent-yellow">
                PRODUCTOS
              </span>
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-lg leading-relaxed">
              Descubre la excelencia en cada detalle. Curamos cada artículo para asegurar que recibas solo lo mejor de YAHPOS!.
            </p>
          </motion.div>
          
          <motion.div variants={headerVariants}>
            <Link href="/categoria/todos" className="group">
              <div className="relative p-[1px] rounded-full bg-gradient-to-r from-corporate-blue to-accent-yellow overflow-hidden transition-transform duration-500 hover:scale-105 active:scale-95">
                <div className="px-8 py-4 rounded-full bg-white dark:bg-black flex items-center gap-3 transition-colors group-hover:bg-transparent">
                  <span className="font-bold uppercase tracking-widest text-sm group-hover:text-white transition-colors">
                    Explorar Todo
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:text-white group-hover:translate-x-2 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Products Grid */}
        <motion.div 
          className="products-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={cardVariants} className="product-card-wrapper h-full">
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
        
        {/* Decorative Floating Element */}
        <div className="mt-20 flex justify-center opacity-50">
          <div className="flex items-center gap-4 animate-bounce">
            <Sparkles className="text-accent-yellow w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-[0.5em] text-gray-400">
              Nuevos Arribos Diarios
            </span>
            <Sparkles className="text-corporate-blue w-6 h-6" />
          </div>
        </div>
      </div>
    </section>
  );
}
