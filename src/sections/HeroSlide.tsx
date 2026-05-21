'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ArrowRight, ShoppingBag, ChevronLeft, ChevronRight, Plus, Trash2, ImagePlus, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'
import { Button } from '@/components/ui/button'

export default function HeroSlide() {
  const editor = useEditor()
  const content = editor?.content ?? {
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
        }
      ]
    },
    store: {
      name: 'YAHPOS! Market',
      slogan: 'Smart Commerce',
      badgeOpen: 'ABIERTO',
      badgeDelivery: 'DESPACHO EN 45 MIN',
    },
  }
  
  const slides = content.hero.slides || []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Asegurar que el índice sea válido si se elimina el último slide
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(Math.max(0, slides.length - 1))
    }
  }, [slides.length, currentIndex])

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)

  // Autoplay desactivado en modo editor
  useEffect(() => {
    if (editor?.isEditorMode || slides.length <= 1) return
    const timer = setInterval(nextSlide, 6000)
    return () => clearInterval(timer)
  }, [editor?.isEditorMode, slides.length])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setIsUploading(true)
    try {
      const publicUrl = await editor.uploadImage(file)
      editor.updateField(`hero.slides.${currentIndex}.imageUrl`, publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Error al subir la imagen. Intenta de nuevo.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const slide = slides[currentIndex]

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      }
    },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  }

  if (!slide) return null

  return (
    <section className="relative w-full h-full flex items-center justify-center overflow-hidden bg-background group/hero">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-brand-accent-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-brand-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-pink-500/10 rounded-full blur-[100px] mix-blend-screen" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {mounted && [...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5
              }}
              animate={{ 
                y: [null, '-20%', '120%'],
                opacity: [0, 0.5, 0]
              }}
              transition={{ 
                duration: 10 + Math.random() * 20, 
                repeat: Infinity, 
                ease: "linear",
                delay: Math.random() * 10
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* Editor Controls */}
      {editor?.isEditorMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10">
          <Button variant="ghost" size="icon" onClick={prevSlide} className="text-white hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="px-4 text-white font-bold">
            Slide {currentIndex + 1} de {slides.length}
          </div>
          <Button variant="ghost" size="icon" onClick={nextSlide} className="text-white hover:bg-white/10">
            <ChevronRight className="w-5 h-5" />
          </Button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { editor.addHeroSlide(); setCurrentIndex(slides.length); }}
            className="text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
          >
            <Plus className="w-4 h-4 mr-2" /> Añadir
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => editor.removeHeroSlide(currentIndex)}
            disabled={slides.length <= 1}
            className="text-red-400 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
          </Button>
        </div>
      )}

      {/* Navigation Arrows (Visible on hover) */}
      {slides.length > 1 && !editor?.isEditorMode && (
        <>
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/5 border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 hover:bg-white/20 transition-all backdrop-blur-md">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/5 border border-white/10 text-white opacity-0 group-hover/hero:opacity-100 hover:bg-white/20 transition-all backdrop-blur-md">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide.id || currentIndex}
            className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center h-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Text Content */}
            <div className="flex flex-col justify-center max-w-2xl">
              {/* Badge */}
              <motion.div variants={itemVariants} className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                  <EditableText
                    field={`hero.slides.${currentIndex}.badge`}
                    value={slide.badge}
                    className="text-xs font-bold uppercase tracking-widest text-brand-accent-200"
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1 
                variants={itemVariants}
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-white mb-6 uppercase"
              >
                {slide.titlePrimary && (
                  <EditableText field={`hero.slides.${currentIndex}.titlePrimary`} value={slide.titlePrimary} className="block" as="span" />
                )}
                {slide.titleAccent && (
                  <EditableText
                    field={`hero.slides.${currentIndex}.titleAccent`}
                    value={slide.titleAccent}
                    as="span"
                    className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent-400 via-brand-400 to-pink-400 block"
                  />
                )}
                {slide.titleSecondary && (
                  <EditableText field={`hero.slides.${currentIndex}.titleSecondary`} value={slide.titleSecondary} className="block" as="span" />
                )}
              </motion.h1>

              {/* Description */}
              <motion.div variants={itemVariants}>
                <EditableText
                  field={`hero.slides.${currentIndex}.description`}
                  value={slide.description}
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
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-accent-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <EditableText field={`hero.slides.${currentIndex}.ctaPrimary`} value={slide.ctaPrimary} className="relative" />
                  <ShoppingBag className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link 
                  href="#offers" 
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md"
                >
                  <EditableText field={`hero.slides.${currentIndex}.ctaSecondary`} value={slide.ctaSecondary} />
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-brand-400" />
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

            </div>

            {/* Visual Content */}
            <div className="hidden lg:flex relative h-full w-full items-center justify-center group/image">
              <motion.div 
                className="relative w-full aspect-square max-w-md"
                variants={itemVariants}
              >
                {editor?.isEditorMode && (
                  <div className="absolute inset-4 z-50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/60 rounded-[3rem] backdrop-blur-md border border-white/20">
                    <div className="flex flex-col gap-3 p-6 items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                      />
                      
                      <Button 
                        variant="secondary" 
                        size="lg"
                        className="w-full font-bold gap-2"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                        { (slide as any).imageUrl ? 'Subir Nueva Imagen' : 'Subir Imagen'}
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white/60 hover:text-white"
                        disabled={isUploading}
                        onClick={() => {
                          const url = window.prompt('URL de la imagen (ej: https://...):', (slide as any).imageUrl || '')
                          if (url !== null) {
                            editor.updateField(`hero.slides.${currentIndex}.imageUrl`, url)
                          }
                        }}
                      >
                        {(slide as any).imageUrl ? 'Pegar URL diferente' : 'Pegar URL de imagen'}
                      </Button>
                      
                      {(slide as any).imageUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => editor.updateField(`hero.slides.${currentIndex}.imageUrl`, '')}
                        >
                          Remover Imagen
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {(slide as any).imageUrl ? (
                  <div className="absolute inset-4 rounded-[3rem] border border-white/20 bg-white/5 shadow-2xl overflow-hidden">
                    <Image 
                      src={(slide as any).imageUrl} 
                      alt={slide.titlePrimary || 'Hero Image'} 
                      fill 
                      className="object-cover"
                      unoptimized={(slide as any).imageUrl.startsWith('http')} 
                    />
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent-500/30 to-brand-500/30 rounded-full blur-[80px] animate-pulse duration-700" />
                    <div className="absolute inset-4 rounded-[3rem] border border-white/20 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
                      <div className="h-12 border-b border-white/10 flex items-center px-6 gap-2 bg-white/5">
                        <div className="w-3 h-3 rounded-full bg-red-400/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                        <div className="w-3 h-3 rounded-full bg-green-400/80" />
                        <div className="ml-auto flex gap-4">
                          <div className="h-2 w-12 bg-white/10 rounded-full" />
                          <div className="h-2 w-8 bg-white/10 rounded-full" />
                        </div>
                      </div>
                      <div className="flex-1 p-8 flex flex-col justify-between relative">
                        <motion.div 
                          animate={{ 
                            rotate: [12, -12, 12],
                            y: [0, -10, 0]
                          }}
                          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-accent-400 to-brand-500 shadow-[0_20px_40px_rgba(59,130,246,0.3)] self-end mb-4" 
                        />
                        <div className="space-y-6">
                          <div className="w-48 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md transform -rotate-3 p-4 flex flex-col justify-between">
                            <div className="h-2 w-1/2 bg-brand-accent-400/50 rounded-full" />
                            <div className="h-2 w-3/4 bg-white/20 rounded-full" />
                          </div>
                          <div className="w-40 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transform rotate-2 self-end ml-auto" />
                        </div>
                        <div className="mt-auto space-y-3">
                          <div className="h-4 w-3/4 bg-white/20 rounded-full" />
                          <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </div>

          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`transition-all duration-300 rounded-full ${i === currentIndex ? 'w-8 h-2 bg-brand-accent-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

