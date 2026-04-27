"use client";

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, Variants } from 'framer-motion';
import { ecommerceConfig } from '@/config/ecommerce'

import TrustStrip from '@/components/layout/TrustStrip';



const categories = ecommerceConfig.categories.list;

interface CategoryCounts {
  [slug: string]: number;
}

export default function CategoriesClient({ counts }: { counts: CategoryCounts }) {
  const container = useRef<HTMLDivElement>(null);

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.8,
        ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
      },
    }),
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.8,
        ease: [0.215, 0.61, 0.355, 1],
      },
    }),
  };

  return (
    <section ref={container} className="relative h-full py-10 flex flex-col bg-white dark:bg-[#030303] overflow-hidden">
      {/* Trust Strip Integration */}
      <div className="relative z-20 border-b border-gray-100 dark:border-white/5 mb-12">
        <TrustStrip />
      </div>

      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-[30%] left-[5%] w-[600px] h-[600px] bg-corporate-blue/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-accent-yellow/8 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 flex-grow flex flex-col justify-center">
        {/* Header Section Compact */}
        <div className="mb-16">
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={headerVariants}
          >
            <Badge variant="outline" className="mb-4 border-corporate-blue/30 text-corporate-blue dark:text-accent-yellow px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
              {ecommerceConfig.categories.subtitle}
            </Badge>
          </motion.div>
          <motion.h2 
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={headerVariants}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter leading-tight uppercase"
          >
            {ecommerceConfig.categories.title}
          </motion.h2>
          <motion.p 
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={headerVariants}
            className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl font-medium leading-relaxed"
          >
            {ecommerceConfig.categories.description}
          </motion.p>
        </div>

        {/* Categories Grid - Compact & Visual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const displayCount = counts[category.slug] || 0;
            
            return (
              <motion.div
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={cardVariants}
                key={category.slug}
              >
                <Link 
                  href={`/categoria/${category.slug}`}
                  className="group relative block h-[180px] overflow-hidden rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 backdrop-blur-3xl transition-all duration-700 hover:border-corporate-blue/30 dark:hover:border-accent-yellow/30 shadow-sm hover:shadow-2xl hover:shadow-corporate-blue/10"
                >
                  {/* Blurred Object on the Right */}
                  <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[70%] h-[120%] pointer-events-none select-none overflow-hidden">
                    <div className="absolute inset-0 opacity-40 blur-[15px] transition-all duration-700 scale-125 group-hover:scale-110 group-hover:blur-[2px] group-hover:opacity-100">
                      <Image 
                        src={category.image} 
                        alt={category.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
   
                  {/* Content Section */}
                  <div className="relative h-full z-20 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter transition-colors duration-300 group-hover:text-indigo-400 group-hover:translate-x-1">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-[60%] line-clamp-2">
                        {category.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-white/10 dark:bg-white/5 border-none text-[10px] font-bold py-1">
                        {displayCount > 0 ? `${displayCount} Productos` : 'Próximamente'}
                      </Badge>
                      <div className="w-8 h-8 rounded-full bg-corporate-blue/10 dark:bg-accent-yellow/10 flex items-center justify-center opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                        <ArrowRight className="w-4 h-4 text-corporate-blue dark:text-accent-yellow" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
