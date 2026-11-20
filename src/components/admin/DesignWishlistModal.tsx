'use client'

import React, { useState } from 'react'
import { 
  Sparkles, 
  Send, 
  Palette, 
  Layout, 
  Camera, 
  MessageSquare,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DesignWishlistModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DesignWishlistModal({ isOpen, onClose }: DesignWishlistModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    area: '',
    description: '',
    inspiration: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simular envío a la "IA" (en el futuro esto guarda en DB y te notifica)
    setTimeout(() => {
      setIsSubmitting(false)
      setStep('success')
      toast.success('¡Solicitud enviada a la IA!')
    }, 1500)
  }

  const options = [
    { id: 'design', label: 'Diseño Visual', icon: Palette, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
    { id: 'layout', label: 'Estructura', icon: Layout, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
    { id: 'content', label: 'Imágenes/Fotos', icon: Camera, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'other', label: 'Otro / Idea', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden mesh-bg">
        {step === 'form' ? (
          <>
            <div className="p-8 pb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Centro de <span className="text-brand-primary">Innovación IA</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">¿Cómo podemos mejorar tu tienda hoy?</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">¿Qué área quieres mejorar?</label>
                <div className="grid grid-cols-2 gap-3">
                  {options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, area: opt.id })}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                        formData.area === opt.id 
                          ? "bg-white dark:bg-gray-800 border-brand-primary ring-2 ring-brand-primary/10 shadow-md" 
                          : "bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-brand-primary/30"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", opt.bg, opt.color)}>
                        <opt.icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        formData.area === opt.id ? "text-brand-primary" : "text-gray-600"
                      )}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Describe tu visión</label>
                <Textarea 
                  placeholder="Ej: Quiero que la cabecera tenga colores más cálidos y las fotos de productos sean más grandes..."
                  className="min-h-[120px] rounded-3xl bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 focus:ring-brand-primary/20 p-4 font-medium"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Inspiración (Opcional)</label>
                <Input 
                  placeholder="Link a una web que te guste o descripción de estilo..."
                  className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/5 focus:ring-brand-primary/20 px-4 font-medium"
                  value={formData.inspiration}
                  onChange={(e) => setFormData({ ...formData, inspiration: e.target.value })}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.area || !formData.description}
                className="w-full h-14 bg-brand-primary hover:bg-brand-700 text-white rounded-[1.5rem] shadow-xl shadow-brand-primary/20 font-black italic uppercase tracking-widest text-xs group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Enviar Solicitud
                    <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase text-gray-900 dark:text-white">¡Mensaje Recibido!</h3>
              <p className="text-sm text-gray-500 mt-2 font-medium">Nuestra IA procesará tu solicitud y nos pondremos en contacto contigo para implementar los cambios.</p>
            </div>
            <Button 
              onClick={onClose}
              variant="outline"
              className="rounded-2xl px-8 h-12 border-gray-200 dark:border-white/10 font-black uppercase italic tracking-widest text-[10px]"
            >
              Cerrar Ventana
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
