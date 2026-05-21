'use client'

import { motion, Variants } from 'framer-motion'
import { PackageOpen, ArrowRight, Plus, Loader2, Upload, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEditor } from '@/providers/EditorProvider'
import { EditableText } from '@/components/editor/EditableText'
import { Button } from '@/components/ui/button'
import { useState, useRef } from 'react'

export default function PacksSlide() {
  const editor = useEditor()
  const content = editor?.content.packs || {
    title: 'Packs &',
    accentTitle: 'Combos',
    description: 'Combina tus productos favoritos y ahorra. Opciones exclusivas creadas para ti con stock limitado.',
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
      editor.updateField(`packs.items.${index}.imageUrl`, publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Error al subir la imagen.')
    } finally {
      setIsUploading(null)
    }
  }

  return (
    <section id="packs" className="relative w-full h-full flex items-center justify-center overflow-hidden bg-background">
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute top-[10%] left-[10%] w-[30vw] h-[30vw] bg-brand-accent-600/10 rounded-full blur-[100px] mix-blend-screen" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
              <PackageOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Lleva más, paga menos
              </span>
            </div>
          </motion.div>

          <motion.h2 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-white mb-4 uppercase"
          >
            <EditableText field="packs.title" value={content.title} as="span" />{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-brand-accent-400">
              <EditableText field="packs.accentTitle" value={content.accentTitle} as="span" />
            </span>
          </motion.h2>
          
          <motion.div variants={itemVariants}>
            <EditableText
              field="packs.description"
              value={content.description}
              as="p"
              className="text-gray-400 max-w-xl mx-auto text-lg"
            />
          </motion.div>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
        >
          {content.items?.map((pack, idx) => (
            <motion.div 
              key={pack.id} 
              variants={itemVariants}
              onMouseEnter={() => editor?.isEditorMode && setActiveItemIndex(idx)}
              onMouseLeave={() => editor?.isEditorMode && setActiveItemIndex(null)}
              className="group relative bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col md:flex-row hover:bg-white/[0.05] hover:border-white/20 transition-all duration-500"
            >
              {/* Editor Overlay */}
              {editor?.isEditorMode && activeItemIndex === idx && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 transition-all p-4">
                  <div className="flex flex-col gap-2 w-full max-w-[140px]">
                    <input
                      type="file"
                      className="hidden"
                      id={`upload-pack-${idx}`}
                      accept="image/*"
                      onChange={(e) => handleUpload(e, idx)}
                    />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-2 font-bold text-[10px]"
                      disabled={isUploading === `item-${idx}`}
                      onClick={() => document.getElementById(`upload-pack-${idx}`)?.click()}
                    >
                      {isUploading === `item-${idx}` ? <Loader2 className="animate-spin w-3 h-3" /> : <Upload className="w-3 h-3" />}
                      Cambiar Imagen
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-400 hover:bg-red-400/10 text-[10px]"
                      onClick={() => {
                        if (confirm('¿Eliminar este pack?')) {
                          const newItems = [...(content.items || [])]
                          newItems.splice(idx, 1)
                          editor.updateField('packs.items', newItems)
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative h-48 md:h-auto md:w-2/5 overflow-hidden bg-white/5">
                <Image 
                  src={pack.imageUrl} 
                  alt={pack.name} 
                  fill 
                  className="object-cover opacity-90 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-110 transition-all duration-700" 
                  unoptimized={pack.imageUrl.startsWith('http')}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#030712] opacity-0 md:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent opacity-80 md:opacity-0" />
              </div>
              
              <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
                <EditableText 
                  field={`packs.items.${idx}.name`} 
                  value={pack.name} 
                  as="h2" 
                  className="text-2xl font-bold text-white mb-2" 
                />
                
                <div className="flex flex-col gap-2 mb-6 text-sm text-gray-400">
                  {(pack as any).features?.map((feat: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <EditableText field={`packs.items.${idx}.features.${i}`} value={feat} />
                    </div>
                  ))}
                  {editor?.isEditorMode && (
                    <button 
                      onClick={() => {
                        const newFeatures = [...((pack as any).features || []), 'Nueva característica']
                        editor.updateField(`packs.items.${idx}.features`, newFeatures)
                      }}
                      className="text-xs text-emerald-400/60 hover:text-emerald-400 flex items-center gap-1 mt-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Añadir característica
                    </button>
                  )}
                </div>

                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <span className="block text-sm text-gray-500 line-through mb-1">
                      <EditableText field={`packs.items.${idx}.oldPrice`} value={pack.oldPrice || ''} />
                    </span>
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-brand-accent-400">
                      <EditableText field={`packs.items.${idx}.price`} value={pack.price} />
                    </span>
                  </div>
                  <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Add Pack Button in Editor Mode */}
          {editor?.isEditorMode && (
            <motion.button
              variants={itemVariants}
              onClick={() => {
                const newItem = {
                  id: Date.now().toString(),
                  name: 'Nuevo Pack',
                  price: '$0',
                  imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=400&auto=format&fit=crop',
                  features: ['Característica 1']
                }
                editor.updateField('packs.items', [...(content.items || []), newItem])
              }}
              className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all p-8 md:min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Plus className="text-white w-6 h-6" />
              </div>
              <span className="text-white font-bold uppercase tracking-widest text-xs">Añadir Pack</span>
            </motion.button>
          )}
        </motion.div>
      </div>
    </section>
  )
}
