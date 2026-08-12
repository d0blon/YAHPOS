"use client"

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Tag, Apple, Beef, Package, Wine, Sparkles, Home, PawPrint, ChevronDown, Droplets, Candy, Baby, Globe } from 'lucide-react'

export interface CategoryItem {
  name: string
  slug?: string
  icon?: React.ComponentType<{ className?: string }>
  iconName?: string
  color: string
  bg: string
  subcats: string[]
}

const CLIENT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Tag,
  Apple,
  Beef,
  Package,
  Wine,
  Sparkles,
  Home,
  PawPrint,
  Droplets,
  Candy,
  Baby,
  Globe
}

const CATEGORIES_Z3: CategoryItem[] = [
  { name: 'Ofertas', icon: Tag, color: 'text-rose-600', bg: 'bg-rose-50', subcats: ['Ofertas del Día', 'Liquidación de Temporada', '2x1 Imperdibles', 'Outlet de Despensa'] },
  { name: 'Frutas y Feria', icon: Apple, color: 'text-emerald-600', bg: 'bg-emerald-50', subcats: ['Frutas de Estación', 'Verduras Frescas', 'Frutos Secos', 'Hierbas y Aliños'] },
  { name: 'Carnicería', icon: Beef, color: 'text-red-600', bg: 'bg-red-50', subcats: ['Cortes de Vacuno', 'Cerdo y Embutidos', 'Pollo y Aves', 'Pescados y Mariscos'] },
  { name: 'Despensa', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', subcats: ['Arroz y Legumbres', 'Fideos y Pastas', 'Aceites y Vinagres', 'Conservas y Sopas'] },
  { name: 'Bebidas', icon: Wine, color: 'text-violet-600', bg: 'bg-violet-50', subcats: ['Bebidas Gasificadas', 'Jugos y Aguas', 'Cervezas y Sidras', 'Vinos y Espumantes'] },
  { name: 'Limpieza', icon: Sparkles, color: 'text-cyan-600', bg: 'bg-cyan-50', subcats: ['Detergentes y Suavizantes', 'Cloros y Desinfectantes', 'Papel Higiénico y Toallas', 'Aseo de Cocina y Baño'] },
  { name: 'Hogar', icon: Home, color: 'text-orange-600', bg: 'bg-orange-50', subcats: ['Menaje y Vajilla', 'Organización del Hogar', 'Iluminación y Pilas', 'Accesorios de Cocina'] },
  { name: 'Mascotas', icon: PawPrint, color: 'text-yellow-600', bg: 'bg-yellow-50', subcats: ['Alimento para Perros', 'Alimento para Gatos', 'Snacks y Premios', 'Higiene y Juguetes'] },
]

export interface CategoryNavProps {
  categories?: CategoryItem[]
}

export default function CategoryNav({ categories }: CategoryNavProps) {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const items = categories || CATEGORIES_Z3

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <section className="bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 sticky top-[69px] md:top-[77px] z-40 transition-colors" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4">
        {/* DESKTOP CATEGORY BAR */}
        <div className="hidden lg:flex items-center justify-between h-12">
          {items.map((cat, idx) => {
            const Icon = cat.icon || (cat.iconName ? CLIENT_ICON_MAP[cat.iconName] : Package)
            const isOpen = activeDropdown === idx
            const catSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')
            return (
              <div 
                key={cat.name} 
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveDropdown(idx)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`h-full px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors border-b-2 ${
                    isOpen ? 'border-brand-primary text-brand-primary dark:text-brand-accent' : 'border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{cat.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${isOpen ? 'rotate-180 text-brand-primary dark:text-brand-accent' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute top-12 left-0 w-72 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-b-2xl shadow-xl py-4 px-5 grid gap-3 animate-in fade-in slide-in-from-top-1 duration-200 z-50">
                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5">
                      Subcategorías de {cat.name}
                    </h4>
                    <div className="grid gap-2">
                      {cat.subcats.map(sub => (
                        <Link
                          key={sub}
                          href={`/categoria/${catSlug}`}
                          className="text-xs text-gray-600 dark:text-gray-350 hover:text-brand-primary dark:hover:text-brand-accent font-semibold transition-colors flex items-center justify-between"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span>{sub}</span>
                          <span className="text-gray-300 dark:text-gray-700">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* MOBILE HORIZONTAL PILL SCROLL */}
        <div className="lg:hidden flex gap-2.5 overflow-x-auto no-scrollbar py-3 scroll-smooth">
          {items.map((cat) => {
            const Icon = cat.icon || (cat.iconName ? CLIENT_ICON_MAP[cat.iconName] : Package)
            const catSlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')
            return (
              <Link
                key={cat.name}
                href={`/categoria/${catSlug}`}
                className="flex flex-col items-center gap-1.5 min-w-[72px] shrink-0 group"
              >
                <div className={`w-11 h-11 rounded-2xl ${cat.bg} flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform shadow-sm`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 text-center leading-none tracking-tight">
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
