"use client";

import { useRef } from 'react';
import Link from 'next/link';
import { 
  Apple, 
  Coffee, 
  Milk, 
  Sparkles, 
  Home, 
  Beef, 
  Wine, 
  Baby,
  ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const categories = [
  {
    id: '1',
    name: 'Alimentos',
    slug: 'alimentos',
    description: 'Arroz, pastas, conserves y más',
    icon: Coffee,
    color: 'from-orange-500 to-red-500',
    productCount: 2500,
  },
  {
    id: '2',
    name: 'Frescos',
    slug: 'frescos',
    description: 'Frutas, verduras y lácteos',
    icon: Apple,
    color: 'from-green-500 to-emerald-500',
    productCount: 800,
  },
  {
    id: '3',
    name: 'Lácteos',
    slug: 'lacteos',
    description: 'Leches, quesos y yogures',
    icon: Milk,
    color: 'from-blue-500 to-cyan-500',
    productCount: 450,
  },
  {
    id: '4',
    name: 'Limpieza',
    slug: 'limpieza',
    description: 'Productos para el hogar',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    productCount: 600,
  },
  {
    id: '5',
    name: 'Hogar',
    slug: 'hogar',
    description: 'Artículos para tu casa',
    icon: Home,
    color: 'from-amber-500 to-yellow-500',
    productCount: 900,
  },
  {
    id: '6',
    name: 'Carnes',
    slug: 'carnes',
    description: 'Carnes rojas, blancas y pescados',
    icon: Beef,
    color: 'from-red-500 to-rose-500',
    productCount: 350,
  },
  {
    id: '7',
    name: 'Bebidas',
    slug: 'bebidas',
    description: 'Jugos, gaseosas y aguas',
    icon: Wine,
    color: 'from-teal-500 to-cyan-500',
    productCount: 550,
  },
  {
    id: '8',
    name: 'Bebés',
    slug: 'bebes',
    description: 'Pañales, fórmulas y más',
    icon: Baby,
    color: 'from-pink-400 to-rose-400',
    productCount: 280,
  },
]

interface CategoryCounts {
  [slug: string]: number;
}

export default function CategoriesClient({ counts }: { counts: CategoryCounts }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: "top 80%",
      }
    });

    tl.from('.cat-header-el', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out'
    })
    .from('.cat-card', {
      y: 50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.05,
      ease: 'back.out(1.5)',
      clearProps: 'all'
    }, "-=0.4");
  }, { scope: container });

  return (
    <section ref={container} className="py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-corporate-blue/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-yellow/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="cat-header-el mb-6 bg-corporate-blue/10 text-corporate-blue dark:bg-white/10 dark:text-white border-none px-4 py-1.5 text-xs font-black uppercase tracking-widest">
            Nuestro Catálogo
          </Badge>
          <h2 className="cat-header-el text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tighter">
            Explora por <span className="text-transparent bg-clip-text bg-gradient-to-r from-corporate-blue to-purple-600 dark:from-accent-yellow dark:to-yellow-500">Categoría</span>
          </h2>
          <p className="cat-header-el text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
            Encuentra todo lo que necesitas organizado para ti. 
            Desde alimentos frescos hasta productos para tu hogar.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {categories.map((category) => {
            const displayCount = counts[category.slug] || 0;
            
            return (
              <Link key={category.slug} href={`/categoria/${category.slug}`}
                className="cat-card group relative overflow-hidden rounded-[2rem] p-6 lg:p-8 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2"
              >
                {/* Dynamic Background Glow on Hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${category.color.includes('orange') ? '#f97316' : 
                      category.color.includes('green') ? '#22c55e' :
                      category.color.includes('blue') ? '#3b82f6' :
                      category.color.includes('purple') ? '#a855f7' :
                      category.color.includes('amber') ? '#f59e0b' :
                      category.color.includes('red') ? '#ef4444' :
                      category.color.includes('teal') ? '#14b8a6' :
                      '#ec4899'} 0%, transparent 70%)`
                  }}
                />

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 shadow-lg shadow-black/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <category.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-corporate-blue dark:group-hover:text-accent-yellow transition-colors tracking-tight">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium line-clamp-2">
                  {category.description}
                </p>
                
                {/* Product Count & Arrow */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-corporate-blue/70 dark:text-white/50 bg-corporate-blue/5 dark:bg-white/5 px-3 py-1 rounded-lg">
                    {displayCount} items
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-corporate-blue group-hover:text-white dark:group-hover:bg-accent-yellow dark:group-hover:text-corporate-dark transition-colors duration-300 transform group-hover:translate-x-1">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
