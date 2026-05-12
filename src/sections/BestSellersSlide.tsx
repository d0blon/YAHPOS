'use client'

import { motion, Variants } from 'framer-motion'
import { Flame, ArrowRight, Star, Loader2, Upload, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'
import { Button } from '@/components/ui/button'
import { useState, useRef } from 'react'

export default function BestSellersSlide() {
  const editor = useEditor()
  const content = editor?.content.bestSellers || {
    title: 'Favoritos del',
    accentTitle: 'Público',
    description: 'Los productos más elegidos por nuestra comunidad. Calidad comprobada y frescura garantizada en tu mesa todos los días.',
    items: []
  }

  const [isUploading, setIsUploading] = useState<string | null>(null)
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)

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
      editor.updateField(`bestSellers.items.${index}.imageUrl`, publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Error al subir la imagen.')
    } finally {
      setIsUploading(null)
    }
  }

  return (
    <section id="bestsellers" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-background">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-yellow-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="container relative z-10 px-4 md:px-6 h-full flex flex-col justify-center">
        <div className="grid lg:grid-cols-3 gap-12 items-center">
          
          <motion.div 
            className="flex flex-col lg:pr-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
          >
            <motion.div variants={itemVariants} className="mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md">
                <Flame className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">
                  Top Ventas
                </span>
              </div>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-white mb-6 uppercase"
            >
              <EditableText field="bestSellers.title" value={content.title} as="span" />{' '}
              <EditableText 
                field="bestSellers.accentTitle" 
                value={content.accentTitle} 
                as="span" 
                className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400" 
              />
            </motion.h2>
            
            <motion.div variants={itemVariants}>
              <EditableText
                field="bestSellers.description"
                value={content.description}
                as="p"
                className="text-gray-400 text-lg mb-8"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link href="/productos" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 backdrop-blur-md group">
                <span>Ver Catálogo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-yellow-400" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="lg:col-span-2 grid grid-cols-2 gap-4 md:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
          >
            {content.items?.map((product, idx) => (
              <motion.div 
                key={product.id} 
                variants={itemVariants}
                onMouseEnter={() => editor?.isEditorMode && setActiveItemIndex(idx)}
                onMouseLeave={() => editor?.isEditorMode && setActiveItemIndex(null)}
                className={`group relative bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500 ${idx % 2 === 1 ? 'mt-8 md:mt-12' : ''}`}
              >
                {/* Editor Overlay */}
                {editor?.isEditorMode && activeItemIndex === idx && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 transition-all p-4">
                    <div className="flex flex-col gap-2 w-full max-w-[140px]">
                      <input
                        type="file"
                        className="hidden"
                        id={`upload-bs-${idx}`}
                        accept="image/*"
                        onChange={(e) => handleUpload(e, idx)}
                      />
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="gap-2 font-bold text-[10px]"
                        disabled={isUploading === `item-${idx}`}
                        onClick={() => document.getElementById(`upload-bs-${idx}`)?.click()}
                      >
                        {isUploading === `item-${idx}` ? <Loader2 className="animate-spin w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        Cambiar Imagen
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:bg-red-400/10 text-[10px]"
                        onClick={() => {
                          if (confirm('¿Eliminar este producto?')) {
                            const newItems = [...(content.items || [])]
                            newItems.splice(idx, 1)
                            editor.updateField('bestSellers.items', newItems)
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="relative h-40 md:h-48 w-full overflow-hidden bg-white/5">
                  <Image 
                    src={product.imageUrl} 
                    alt={product.name} 
                    fill 
                    className="object-cover opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                    unoptimized={product.imageUrl.startsWith('http')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-bold text-white">
                      <EditableText field={`bestSellers.items.${idx}.rating`} value={product.rating || '5.0'} />
                    </span>
                  </div>
                </div>
                <div className="p-4 md:p-5 relative z-10">
                  <EditableText 
                    field={`bestSellers.items.${idx}.name`} 
                    value={product.name} 
                    as="h2" 
                    className="text-lg font-bold text-white mb-1 line-clamp-1" 
                  />
                  <div className="text-yellow-400 font-black">
                    <EditableText field={`bestSellers.items.${idx}.price`} value={product.price} />
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add Product Button in Editor Mode */}
            {editor?.isEditorMode && (
              <motion.button
                variants={itemVariants}
                onClick={() => {
                  const newItem = {
                    id: Date.now().toString(),
                    name: 'Nuevo Producto',
                    price: '$0',
                    imageUrl: '/images/products/placeholder.png',
                    rating: '5.0'
                  }
                  editor.updateField('bestSellers.items', [...(content.items || []), newItem])
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all p-6 min-h-[160px]"
              >
                <Plus className="text-white w-6 h-6" />
                <span className="text-white font-bold uppercase tracking-widest text-[10px]">Añadir Producto</span>
              </motion.button>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
