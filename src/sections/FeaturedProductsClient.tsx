'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Registramos ScrollTrigger de GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedProductsClientProps {
  products: Product[];
}

export default function FeaturedProductsClient({ products }: FeaturedProductsClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Animación del header
    gsap.from('.section-header > *', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 80%',
        toggleActions: 'play none none none',
      }
    });

    // Animación de los productos
    gsap.from('.product-card-wrapper', {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'back.out(1.2)',
      scrollTrigger: {
        trigger: '.products-grid',
        start: 'top 85%',
        toggleActions: 'play none none none',
      }
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-20 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="section-header flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <Badge variant="secondary" className="mb-4 bg-corporate-blue/10 text-corporate-blue hover:bg-corporate-blue/20 dark:bg-accent-yellow/10 dark:text-accent-yellow dark:hover:bg-accent-yellow/20">
              Destacados
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Productos <span className="text-corporate-blue dark:text-accent-yellow">Destacados</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
              Descubre nuestra selección de productos más populares con los mejores precios del mercado.
            </p>
          </div>
          <Link href="/categoria/todos">
            <Button variant="outline" className="group rounded-full px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-corporate-blue dark:hover:border-accent-yellow shadow-sm hover:shadow-md transition-all duration-300">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="products-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <div key={product.id} className="product-card-wrapper h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-corporate-blue/5 dark:bg-accent-yellow/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-corporate-cyan/5 dark:bg-corporate-blue/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
    </section>
  );
}
