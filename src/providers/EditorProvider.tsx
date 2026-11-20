'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { useSaaS } from '@/providers/SaaSProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeroSlideConfig {
  id: string
  badge: string
  titlePrimary: string
  titleAccent: string
  titleSecondary: string
  description: string
  ctaPrimary: string
  ctaSecondary: string
  imageUrl?: string
}

export interface SlideItem {
  id: string
  name: string
  slug: string
  price: string
  oldPrice?: string
  discount?: string
  rating?: string
  imageUrl: string
  productId?: string // ID del producto en Supabase para sincronización dinámica
}

export interface SectionConfig {
  title: string
  accentTitle: string
  description: string
  items?: SlideItem[]
}

export interface SiteContent {
  hero: {
    slides: HeroSlideConfig[]
  }
  offers: SectionConfig
  bestSellers: SectionConfig
  packs: SectionConfig
  delivery: {
    title: string
    accentTitle: string
    description: string
    ctaText: string
    imageUrl?: string
    features?: { icon: string; text: string }[]
  }
  points: {
    title: string
    accentTitle: string
    description: string
    benefits: {
      icon: string
      title: string
      desc: string
    }[]
  }
  footer: {
    description: string
    contact: {
      address: string
      email: string
      phone: string
      hours: string
    }
    socials: {
      fb: string
      ig: string
      tw: string
      wa: string
    }
    links: {
      shop: { label: string, href: string }[]
      company: { label: string, href: string }[]
      support: { label: string, href: string }[]
    }
    features: {
      icon: string
      title: string
      sub: string
      color: string
    }[]
  }
  whatsapp: {
    phone: string
    message: string
  }
  store: {
    name: string
    slogan: string
    badgeOpen: string
    badgeDelivery: string
  }
}

interface DbProduct {
  id: string | number
  name: string
  slug: string
  price: number
  image: string
  originalPrice?: number
}

type RawSiteContent = Partial<SiteContent> & {
  hero?: Partial<SiteContent['hero']> & Partial<HeroSlideConfig>
}

function getSupportEmail(): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  if (typeof configured !== 'string') return null
  const email = configured.trim()
  return email.length > 0 ? email : null
}

function buildDefaultContent(): SiteContent {
  return {
    hero: {
      slides: [
        {
          id: 'slide-1',
          badge: 'Abierto • Despacho en 45 min',
          titlePrimary: 'EL MARKET',
          titleAccent: 'QUE TU HOGAR',
          titleSecondary: 'MERECE.',
          description: 'Calidad artesanal, frescura patagónica y una experiencia de compra diseñada para tu comodidad absoluta.',
          ctaPrimary: 'Ver Productos',
          ctaSecondary: 'Ofertas Hoy',
          imageUrl: '',
        }
      ]
    },
    offers: {
      title: 'Ofertas',
      accentTitle: 'Imperdibles',
      description: 'Aprovecha nuestros descuentos semanales. Stock limitado por promoción.',
      items: [
        { id: '1', productId: '26', name: 'Bebida Cola 2.5L', slug: 'bebida-cola-2-5l', discount: '30%', price: '$1.990', oldPrice: '$2.850', imageUrl: '/images/products/cocacola-600ml.png' },
        { id: '2', productId: '27', name: 'Cerveza Lata', slug: 'cerveza-lata', discount: '2x1', price: '$1.500', oldPrice: '$3.000', imageUrl: '/images/products/placeholder.png' },
        { id: '3', productId: '16', name: 'Arroz Premium', slug: 'arroz-premium', discount: '25%', price: '$3.490', oldPrice: '$4.650', imageUrl: '/images/products/arroz-1kg.png' },
      ]
    },
    bestSellers: {
      title: 'Top',
      accentTitle: 'Ventas',
      description: 'Los favoritos de nuestra comunidad patagónica. Calidad garantizada.',
      items: [
        { id: '1', productId: '18', name: 'Pan de Molde', slug: 'pan-de-molde', price: '$1.200', imageUrl: '/images/products/pan-molde.png' },
        { id: '2', productId: '17', name: 'Leche Entera 1L', slug: 'leche-entera-1l', price: '$1.100', imageUrl: '/images/products/leche-1l.png' },
        { id: '3', productId: '25', name: 'Queso Gouda', slug: 'queso-gouda', price: '$4.500', imageUrl: '/images/products/placeholder.png' },
      ]
    },
    packs: {
      title: 'Combos y',
      accentTitle: 'Packs',
      description: 'Ahorra comprando en conjunto. Diseñados para tu familia.',
      items: [
        { id: '1', name: 'Pack Desayuno', slug: 'pack-desayuno', price: '$8.990', oldPrice: '$12.000', imageUrl: '/images/products/leche-1l.png' },
        { id: '2', name: 'Combo Parrilla', slug: 'combo-parrilla', price: '$24.990', oldPrice: '$30.000', imageUrl: '/images/products/lomo-vetado.png' },
      ]
    },
    delivery: {
      title: 'Despacho',
      accentTitle: 'Gratis',
      description: 'Por compras sobre $30.000, llevamos tu pedido a la puerta de tu casa sin costo adicional.',
      ctaText: 'Comprar Ahora',
      imageUrl: '/images/products/placeholder.png'
    },
    points: {
      title: 'Club de',
      accentTitle: 'Puntos',
      description: 'Únete gratis y empieza a ganar. Cada peso cuenta para conseguir tus productos favoritos totalmente gratis o con descuentos increíbles.',
      benefits: [
        { icon: 'Gift', title: 'Recompensas Exclusivas', desc: 'Canjea puntos por productos gratis y descuentos especiales.' },
        { icon: 'Star', title: 'Acumulación Automática', desc: 'Suma puntos con cada compra dictando tu RUT en caja.' },
        { icon: 'ShieldCheck', title: 'Niveles Premium', desc: 'Asciende a Archipiélago o YAHPOS! Platinum para obtener beneficios únicos.' },
      ]
    },
    footer: {
      description: 'Redefiniendo el e-commerce local con tecnología de vanguardia y atención personalizada.',
      contact: {
        address: 'Avenida Costanera 1234, Castro, Chiloé',
        email: getSupportEmail() ?? '',
        phone: '+56 9 1234 5678',
        hours: 'Lun - Sab: 09:00 - 20:00'
      },
      socials: {
        fb: '#',
        ig: '#',
        tw: '#',
        wa: '#'
      },
      links: {
        shop: [
          { label: 'Alimentos', href: '/categoria/alimentos' },
          { label: 'Bebidas', href: '/categoria/bebidas' },
          { label: 'Frescos', href: '/categoria/frescos' },
          { label: 'Limpieza', href: '/categoria/limpieza' },
          { label: 'Hogar', href: '/categoria/hogar' },
        ],
        company: [
          { label: 'Sobre Nosotros', href: '/nosotros' },
          { label: 'Contacto', href: '/contacto' },
          { label: 'Trabaja con Nosotros', href: '/trabaja-con-nosotros' },
        ],
        support: [
          { label: 'Centro de Ayuda', href: '/ayuda' },
          { label: 'Envíos y Entregas', href: '/envios' },
          { label: 'Devoluciones', href: '/devoluciones' },
          { label: 'Términos', href: '/terminos' },
        ],
      },
      features: [
        { icon: 'Truck', title: 'ENVÍO YAHPOS!', sub: 'Mismo día garantizado', color: 'text-blue-400' },
        { icon: 'CreditCard', title: 'PAGO BLINDADO', sub: 'Seguridad nivel bancario', color: 'text-brand-400' },
        { icon: 'ShieldCheck', title: 'GARANTÍA TOTAL', sub: 'Satisfacción certificada', color: 'text-emerald-400' },
        { icon: 'Headphones', title: 'SOPORTE 24/7', sub: 'Línea prioritaria miembros', color: 'text-amber-400' },
      ]
    },
    whatsapp: {
      phone: '56912345678',
      message: '¡Hola! Vengo desde el E-commerce y necesito ayuda.'
    },
    store: {
      name: 'YAHPOS! Market',
      slogan: 'Smart Commerce',
      badgeOpen: 'ABIERTO',
      badgeDelivery: 'DESPACHO EN 45 MIN',
    },
  }
}

interface EditorContextType {
  isEditorMode: boolean
  toggleEditorMode: () => void
  content: SiteContent
  updateField: (path: string, value: unknown) => void
  addHeroSlide: () => void
  removeHeroSlide: (index: number) => void
  saveChanges: () => Promise<void>
  isSaving: boolean
  hasUnsavedChanges: boolean
  discardChanges: () => void
  uploadImage: (file: File) => Promise<string>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
  return useContext(EditorContext) // returns null when outside EditorProvider — components must handle null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const { storeId } = useSaaS()
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [content, setContent] = useState<SiteContent>(() => buildDefaultContent())
  const [savedContent, setSavedContent] = useState<SiteContent>(() => buildDefaultContent())
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([])

  // Load content and products from Supabase on mount (scoped to current tenant)
  useEffect(() => {
    if (!storeId) return // fail-closed: wait for tenant resolution
    async function fetchData() {
      try {
        const defaults = buildDefaultContent()
        // 1. Fetch site_content from stores.config (scoped by current tenant)
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, config')
          .eq('id', storeId)
          .single()

        if (storeError) {
          console.warn('[EditorProvider] Could not load store config for', storeId, storeError)
          return
        }

        const settingsData: { site_content?: RawSiteContent } = { site_content: storeData?.config?.site_content }

        // 2. Fetch all active products for dynamic mapping
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, slug, price, image')
          .eq('store_id', storeId)
          .limit(500)

        if (productsData) setDbProducts(productsData)

        if (settingsData?.site_content && Object.keys(settingsData.site_content).length > 0) {
          const rawContent = settingsData.site_content;
          
          // Migration: if the old hero format is an object instead of having a `slides` array
          if (rawContent.hero && !Array.isArray(rawContent.hero.slides)) {
            rawContent.hero = {
              slides: [
                {
                  id: 'slide-1',
                  badge: rawContent.hero.badge || defaults.hero.slides[0].badge,
                  titlePrimary: rawContent.hero.titlePrimary || defaults.hero.slides[0].titlePrimary,
                  titleAccent: rawContent.hero.titleAccent || defaults.hero.slides[0].titleAccent,
                  titleSecondary: rawContent.hero.titleSecondary || defaults.hero.slides[0].titleSecondary,
                  description: rawContent.hero.description || defaults.hero.slides[0].description,
                  ctaPrimary: rawContent.hero.ctaPrimary || defaults.hero.slides[0].ctaPrimary,
                  ctaSecondary: rawContent.hero.ctaSecondary || defaults.hero.slides[0].ctaSecondary,
                  imageUrl: rawContent.hero.imageUrl || defaults.hero.slides[0].imageUrl,
                }
              ]
            }
          }

          const merged = deepMerge(defaults, rawContent) as SiteContent
          setContent(merged)
          setSavedContent(merged)
        }
      } catch (err) {
        console.warn('[EditorProvider] Could not load data:', err)
      }
    }
    fetchData()
  }, [storeId])

  // Deep set a nested value by dot-path (e.g. "hero.slides.0.badge")
  const updateField = useCallback((path: string, value: unknown) => {
    setContent(prev => {
      const next = deepClone(prev)
      setNestedValue(next, path, value)
      return next
    })
    setHasUnsavedChanges(true)
  }, [])

  // ─── Dynamic Merging Logic ──────────────────────────────────────────────────
  
  const liveContent = useMemo(() => {
    const next = deepClone(content)
    
    const sections: ('offers' | 'bestSellers' | 'packs')[] = ['offers', 'bestSellers', 'packs']
    
    sections.forEach(sectionKey => {
      const section = next[sectionKey]
      if (section?.items) {
        section.items = section.items.map(item => {
          if (!item.productId) return item
          
          const dbProduct = dbProducts.find(p => String(p.id) === String(item.productId))
          if (!dbProduct) return item
          
          return {
            ...item,
            name: dbProduct.name || item.name,
            slug: dbProduct.slug || item.slug,
            price: formatPrice(dbProduct.price),
            imageUrl: dbProduct.image || item.imageUrl,
            // discount and oldPrice are handled manually in CMS for now 
            // but we could also fetch them from dbProduct.originalPrice if needed
            oldPrice: dbProduct.originalPrice ? formatPrice(dbProduct.originalPrice) : item.oldPrice
          }
        })
      }
    })
    
    return next
  }, [content, dbProducts])

  const addHeroSlide = useCallback(() => {
    setContent(prev => {
      const next = deepClone(prev)
      const newSlide: HeroSlideConfig = {
        id: `slide-${Date.now()}`,
        badge: 'NUEVO SLIDE',
        titlePrimary: 'NUEVO',
        titleAccent: 'TÍTULO',
        titleSecondary: 'AQUÍ',
        description: 'Descripción del nuevo slide. Haz clic para editar.',
        ctaPrimary: 'Acción 1',
        ctaSecondary: 'Acción 2',
        imageUrl: '',
      }
      next.hero.slides.push(newSlide)
      return next
    })
    setHasUnsavedChanges(true)
  }, [])

  const removeHeroSlide = useCallback((index: number) => {
    setContent(prev => {
      const next = deepClone(prev)
      if (next.hero.slides.length > 1) {
        next.hero.slides.splice(index, 1)
      }
      return next
    })
    setHasUnsavedChanges(true)
  }, [])

  const saveChanges = useCallback(async () => {
    if (!storeId) {
      console.error('[EditorProvider] saveChanges aborted: no storeId resolved (fail-closed)')
      return
    }
    setIsSaving(true)
    try {
      // 1. Obtener config actual para no sobrescribir otros campos (scoped by tenant)
      const { data: currentStore, error: loadError } = await supabase
        .from('stores')
        .select('id, config')
        .eq('id', storeId)
        .single()

      if (loadError) throw loadError
      if (!currentStore) throw new Error('Store not found for current tenant')

      const newConfig = {
        ...(currentStore.config || {}),
        site_content: content
      }

      const { error } = await supabase
        .from('stores')
        .update({ config: newConfig })
        .eq('id', storeId)

      if (error) throw error

      setSavedContent(content)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('[EditorProvider] Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }, [content, storeId])

  const discardChanges = useCallback(() => {
    setContent(savedContent)
    setHasUnsavedChanges(false)
  }, [savedContent])

  const toggleEditorMode = useCallback(() => {
    setIsEditorMode(v => {
      if (v && hasUnsavedChanges) discardChanges()
      return !v
    })
  }, [hasUnsavedChanges, discardChanges])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `hero/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(filePath, file)

    if (uploadError) {
      console.error('[EditorProvider] Upload failed:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage
      .from('site-assets')
      .getPublicUrl(filePath)

    return data.publicUrl
  }, [])

  return (
    <EditorContext.Provider value={{
      isEditorMode,
      toggleEditorMode,
      content: liveContent, // Provide merged content
      updateField,
      addHeroSlide,
      removeHeroSlide,
      saveChanges,
      isSaving,
      hasUnsavedChanges,
      discardChanges,
      uploadImage,
    }}>
      {children}
    </EditorContext.Provider>
  )
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function deepMerge<T extends object>(base: T, override: object): T {
  const result = { ...base } as unknown as Record<string, unknown>
  const baseRecord = { ...base } as unknown as Record<string, unknown>
  const overrideRecord: Record<string, unknown> = { ...override }
  for (const key of Object.keys(overrideRecord)) {
    const overrideValue = overrideRecord[key]
    if (overrideValue !== null && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
      result[key] = deepMerge((baseRecord[key] ?? {}) as object, overrideValue)
    } else {
      result[key] = overrideValue
    }
  }
  return result as T
}

function setNestedValue(obj: object, path: string, value: unknown) {
  const keys = path.split('.')
  let current = obj as Record<string, unknown>
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}
