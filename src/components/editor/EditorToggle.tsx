'use client'

import { useEditor } from '@/providers/EditorProvider'
import { Pencil, X, Save, RotateCcw, Check, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Floating Editor Toggle button — renderiza via Portal directamente en <body>
 * para escapar del stacking context del contenedor snap-scroll con overflow-y-auto.
 */
export function EditorToggle() {
  const editor = useEditor()
  const pathname = usePathname()
  const isEditorMode = editor?.isEditorMode ?? false
  const toggleEditorMode = editor?.toggleEditorMode ?? (() => {})
  const saveChanges = editor?.saveChanges ?? (async () => {})
  const isSaving = editor?.isSaving ?? false
  const hasUnsavedChanges = editor?.hasUnsavedChanges ?? false
  const discardChanges = editor?.discardChanges ?? (() => {})
  const [showSaved, setShowSaved] = useState(false)
  const [mounted, setMounted] = useState(false)

  const handleSave = async () => {
    await saveChanges()
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  // Portal solo se puede crear en el cliente
  useEffect(() => { setMounted(true) }, [])

  // Excluir páginas que no son del ecommerce (admin, developer, auth, pos, etc.)
  const isExcluded = pathname.startsWith('/admin') || 
                     pathname.startsWith('/developer') || 
                     pathname.startsWith('/auth') ||
                     pathname.startsWith('/pos') ||
                     pathname === '/login' ||
                     pathname === '/registro' ||
                     pathname === '/recuperar-contrasena' ||
                     pathname === '/completar-perfil'

  // En producción (yahpos.cl), la landing page en '/' es marketing, no e-commerce
  const isProdLandingPage = typeof window !== 'undefined' && 
                            window.location.hostname === 'yahpos.cl' &&
                            pathname === '/'

  if (!mounted || !editor || isExcluded || isProdLandingPage) return null

  const ui = (
    <div
      style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 999999 }}
      className="flex flex-col items-start gap-2"
    >
      {/* Unsaved changes toolbar */}
      {isEditorMode && hasUnsavedChanges && (
        <div className="flex items-center gap-2 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
            Cambios sin guardar
          </span>
          <div className="flex gap-1.5 ml-2">
            <button
              onClick={discardChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white/80 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-widest text-white transition-all disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : showSaved ? (
                <Check className="w-3 h-3" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {isSaving ? 'Guardando...' : showSaved ? '¡Guardado!' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={toggleEditorMode}
        className={[
          'group flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em]',
          'shadow-2xl transition-all duration-300 active:scale-95',
          isEditorMode
            ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 shadow-blue-500/20'
            : 'bg-[#0f172a]/95 backdrop-blur-xl hover:bg-[#1e293b] text-white/70 hover:text-white border border-white/10',
        ].join(' ')}
        title={isEditorMode ? 'Salir del modo editor' : 'Activar modo editor'}
      >
        {isEditorMode ? (
          <>
            <X className="w-4 h-4" />
            <span>Salir del editor</span>
          </>
        ) : (
          <>
            <Pencil className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Modo Editor</span>
          </>
        )}
      </button>

      {/* Hint */}
      {isEditorMode && !hasUnsavedChanges && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 pl-1">
          Click en cualquier texto azul para editar
        </p>
      )}
    </div>
  )

  // Portal al body — escapa de cualquier stacking context
  return createPortal(ui, document.body)
}
