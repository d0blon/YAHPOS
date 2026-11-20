'use client'

import { motion, Variants } from 'framer-motion'
import { Tag, ArrowRight, Loader2, Upload, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'
import { Button } from '@/components/ui/button'
import { useState, useRef, useSyncExternalStore } from 'react'

const subscribeClientOnly = () => () => {}

interface Particle {
  x: string
  y: string
  opacity: number
  duration: number
}

const PARTICLES: Particle[] = [...Array(8)].map(() => ({
  x: Math.random() * 100 + '%',
  y: Math.random() * 100 + '%',
  opacity: Math.random() * 0.5,
  duration: 15 + Math.random() * 20
}))

export default function OffersSlide() {
  const editor = useEditor()
  const content = editor?.content.offers || {
    title: 'Ofertas de',
    accentTitle: 'Locura',
    description: 'Aprovecha nuestros descuentos semanales. Stock limitado por promoción.',
    items: []
  }
  
  const [isUploading, setIsUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const mounted = useSyncExternalStore(subscribeClientOnly, () => true, () => false)

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setIsUploading(`item-${index}`)
    try {
      const publicUrl = await editor.uploadImage(file)
      editor.updateField(`offers.items.${index}.imageUrl`, publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Error al subir la imagen.')
    } finally {
      setIsUploading(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <section id="offers" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-background">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-red-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen" />
        
        {/* Floating Particles */}
        {mounted && (
          <div className="absolute inset-0 overflow-hidden">
            {PARTICLES.map((p, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-red-500/20 rounded-full"
                initial={{
                  x: p.x,
                  y: p.y,
                  opacity: p.opacity
                }}
                animate={{ 
                  y: [null, '-20%', '120%'],
                  opacity: [0, 0.4, 0]
                }}
                transition={{ 
                  duration: p.duration,
                  repeat: Infinity, 
                  ease: "linear"
                }}
              />
            ))}
          </div>
        )}

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
            <EditableText field="offers.title" value={content.title} as="span" />{' '}
            <EditableText 
              field="offers.accentTitle" 
              value={content.accentTitle} 
              as="span" 
              className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400" 
            />
          </motion.h2>
          
          <motion.div variants={itemVariants}>
            <EditableText
              field="offers.description"
              value={content.description}
              as="p"
              className="text-gray-400 max-w-xl mx-auto text-lg"
            />
          </motion.div>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
        >
          {content.items?.map((item, index) => (
            <motion.div 
              key={item.id} 
              variants={itemVariants}
              onMouseEnter={() => editor?.isEditorMode && setActiveItemIndex(index)}
              onMouseLeave={() => editor?.isEditorMode && setActiveItemIndex(null)}
              className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 flex flex-col group/item"
            >
              {/* Badge Descuento */}
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-red-500 text-white font-black px-3 py-1 rounded-full text-sm shadow-lg shadow-red-500/30 transform rotate-3 group-hover:rotate-6 transition-transform">
                  <EditableText field={`offers.items.${index}.discount`} value={item.discount || ''} />
                </div>
              </div>

              {/* Editor Overlay for Item */}
              {editor?.isEditorMode && activeItemIndex === index && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 transition-all">
                  <div className="flex flex-col gap-2 p-4 w-full max-w-[200px]">
                    <input
                      type="file"
                      className="hidden"
                      id={`upload-${index}`}
                      accept="image/*"
                      onChange={(e) => handleUpload(e, index)}
                    />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2 font-bold"
                      disabled={isUploading === `item-${index}`}
                      onClick={() => document.getElementById(`upload-${index}`)?.click()}
                    >
                      {isUploading === `item-${index}` ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                      Imagen
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:bg-red-400/10"
                      onClick={() => {
                        if (confirm('¿Eliminar esta oferta?')) {
                          const newItems = [...(content.items || [])]
                          newItems.splice(index, 1)
                          editor.updateField('offers.items', newItems)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Container */}
              <div className="relative h-56 w-full overflow-hidden bg-white/5">
                <Image 
                  src={item.imageUrl} 
                  alt={item.name} 
                  fill 
                  className="object-cover opacity-90 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-110 transition-all duration-700" 
                  unoptimized={item.imageUrl.startsWith('http')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col relative z-10">
                <EditableText 
                  field={`offers.items.${index}.name`} 
                  value={item.name} 
                  as="h2" 
                  className="text-xl font-bold text-white mb-2" 
                />
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    <EditableText field={`offers.items.${index}.price`} value={item.price} />
                  </span>
                  {item.oldPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      <EditableText field={`offers.items.${index}.oldPrice`} value={item.oldPrice} />
                    </span>
                  )}
                </div>
                <button className="mt-auto w-full py-3 rounded-xl bg-white/5 text-white border border-white/10 font-bold hover:bg-red-500 hover:border-red-500 transition-all duration-300">
                  Agregar al Carrito
                </button>
              </div>
            </motion.div>
          ))}

          {/* Add Item Button in Editor Mode */}
          {editor?.isEditorMode && (
            <motion.button
              variants={itemVariants}
              onClick={() => {
                const newItem = {
                  id: Date.now().toString(),
                  name: 'Nueva Oferta',
                  price: '$0',
                  imageUrl: '/images/products/placeholder.png'
                }
                editor.updateField('offers.items', [...(content.items || []), newItem])
              }}
              className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all p-8"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Plus className="text-white w-6 h-6" />
              </div>
              <span className="text-white font-bold uppercase tracking-widest text-xs">Añadir Oferta</span>
            </motion.button>
          )}
        </motion.div>
        
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
        >
          <Link href="/productos" className="inline-flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest hover:text-red-300 transition-colors group">
            Ver todas las ofertas <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
