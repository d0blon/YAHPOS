'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Save, PaintBucket, ImageIcon, Palette, Lock, Crown, ExternalLink,
  Check, Eye, Upload, Sparkles, X
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSaaS } from '@/providers/SaaSProvider'
import { updateStoreSettingsAction } from '@/app/developer/actions'
import { cn } from '@/lib/utils'
import { getContrastRatio, getContrastRating } from '@/lib/contrast'

const LOGO_VARIANTS = [
  { id: 'master', src: '/logos/yahpos_logo_master.svg', label: 'Principal', width: 1523, height: 286 },
  { id: 'master_dark', src: '/logos/yahpos_logo_master_dark.svg', label: 'Dark', width: 512, height: 96 },
  { id: 'square', src: '/logos/yahpos_logo_square_master.svg', label: 'Cuadrado', width: 848, height: 558 },
  { id: 'square_dark', src: '/logos/yahpos_logo_square_master_dark.svg', label: 'Sqr Dark', width: 848, height: 558 },
]

const DEFAULT_LOGO_SIZE = { width: 1523, height: 286 }

export default function BrandingPage() {
  const { config, storeId, tier, refreshConfig } = useSaaS()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedVariant, setSelectedVariant] = useState(LOGO_VARIANTS[0].src)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null)
  const [storeName, setStoreName] = useState(config.store_name)
  const [primaryColor, setPrimaryColor] = useState('#4b0082')
  const [accentColor, setAccentColor] = useState('#FFD100')
  const [surfaceColor, setSurfaceColor] = useState('')
  const [brandingEnabled, setBrandingEnabled] = useState(config.white_label_enabled)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const isPatagonia = tier === 'patagonia'

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón de hidratación/fetch sin cambio de comportamiento
    setStoreName(config.store_name)
    setBrandingEnabled(config.white_label_enabled)
    setPrimaryColor(config.appearance_primary_color || '#4b0082')
    setAccentColor(config.accent_color || '#FFD100')
    setSurfaceColor(config.surface_color || '')
    if (config.store_logo) {
      setSavedLogoUrl(config.store_logo)
      setSelectedVariant('')
    }
  }, [
    config.store_name,
    config.white_label_enabled,
    config.appearance_primary_color,
    config.accent_color,
    config.surface_color,
    config.store_logo
  ])

  const displayLogo = useMemo(() => {
    if (uploadedPreviewUrl) return uploadedPreviewUrl
    if (savedLogoUrl) return savedLogoUrl
    if (selectedVariant) return selectedVariant
    return LOGO_VARIANTS[0].src
  }, [uploadedPreviewUrl, savedLogoUrl, selectedVariant])

  const displayLogoSize = useMemo(() => {
    const variant = LOGO_VARIANTS.find(item => item.src === displayLogo)
    return variant
      ? { width: variant.width, height: variant.height }
      : DEFAULT_LOGO_SIZE
  }, [displayLogo])

  const handleVariantSelect = (src: string) => {
    setSelectedVariant(src)
    setUploadedFile(null)
    if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl)
    setUploadedPreviewUrl(null)
  }

  const validateAndSetFile = (file: File | null) => {
    if (!file) return
    if (!['image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo se permiten archivos PNG o WebP (SVG no permitido por seguridad)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 2MB')
      return
    }
    setUploadedFile(file)
    setUploadedPreviewUrl(URL.createObjectURL(file))
    setSelectedVariant('')
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) validateAndSetFile(e.dataTransfer.files[0])
  }, [])

  const clearUploadedFile = () => {
    setUploadedFile(null)
    if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl)
    setUploadedPreviewUrl(null)
  }

  const handleSave = async () => {
    if (!storeId) {
      toast.error('No hay tienda seleccionada')
      return
    }

    setIsSaving(true)
    try {
      let finalLogoUrl = displayLogo

      if (uploadedFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', uploadedFile)
        const uploadRes = await fetch('/api/settings/upload-logo', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Error al subir el logo')
        finalLogoUrl = uploadData.url
        setIsUploading(false)
      }

      const result = await updateStoreSettingsAction(storeId, {
        appearance_logo_url: finalLogoUrl,
        appearance_primary_color: primaryColor,
        appearance_secondary_color: accentColor,
        store_logo: finalLogoUrl,
        store_name: storeName,
        white_label_enabled: brandingEnabled,
        accent_color: accentColor,
        surface_color: surfaceColor || null,
      })
      if (!result.success) throw new Error(result.error)

      await refreshConfig()
      setSavedLogoUrl(finalLogoUrl)
      setUploadedFile(null)
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl)
      setUploadedPreviewUrl(null)
      toast.success('Cambios guardados correctamente')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar los cambios')
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <PaintBucket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white">
              Branding<span className="text-brand-500"> Studio</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-bold tracking-tight">
            Personaliza la identidad visual de tu tienda
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-600/20 hover:shadow-brand-500/30 transition-all duration-300"
        >
          {isSaving || isUploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column - Config */}
        <div className="lg:col-span-3 space-y-6">

          {/* Identidad Section */}
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/60 backdrop-blur-xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/10">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Identidad</h2>
                  <p className="text-[10px] text-gray-500 font-bold tracking-tight">Logotipo y nombre de marca</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Logo Preview */}
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                  Logo Actual
                </Label>
                <div className="p-6 bg-black/40 rounded-xl border border-gray-800/50 flex items-center justify-center min-h-[120px]">
                  {displayLogo ? (
                    <Image
                      src={displayLogo}
                      alt="Logo preview"
                      width={displayLogoSize.width}
                      height={displayLogoSize.height}
                      unoptimized
                      className="max-h-16 max-w-full w-auto object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* SVG Variants */}
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                  Variantes de Logo
                </Label>
                <div className="grid grid-cols-4 gap-3">
                  {LOGO_VARIANTS.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantSelect(variant.src)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 group bg-black/20",
                        selectedVariant === variant.src && !uploadedFile
                          ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                          : "border-gray-800/50 hover:border-gray-700/50 hover:bg-gray-800/30"
                      )}
                    >
                      <Image
                        src={variant.src}
                        alt={variant.label}
                        width={variant.width}
                        height={variant.height}
                        unoptimized
                        className="h-8 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        selectedVariant === variant.src && !uploadedFile ? "text-brand-400" : "text-gray-500"
                      )}>
                        {variant.label}
                      </span>
                      {selectedVariant === variant.src && !uploadedFile && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag & Drop Upload */}
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                  Subir Logo Personalizado
                </Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[140px]",
                    isDragging
                      ? "border-brand-500 bg-brand-500/10"
                      : uploadedFile
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800/20"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.webp,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
                  />
                  {uploadedFile ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-400">{uploadedFile.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">
                          {(uploadedFile.size / 1024).toFixed(1)} KB — Listo para guardar
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearUploadedFile() }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-800/80 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-400">
                          Arrastra tu logo aquí
                        </p>
                        <p className="text-[10px] text-gray-600 font-bold mt-1">
                          SVG, PNG o WebP — Max 2MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Store Name */}
              <div>
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                  Nombre de la Tienda
                </Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Mi Tienda"
                  className="bg-black/40 border-gray-800/50 text-white h-11 rounded-xl font-bold tracking-tight"
                />
              </div>
            </div>
          </Card>

          {/* Colores Section */}
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/60 backdrop-blur-xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/10 flex items-center justify-center border border-rose-500/10">
                  <Palette className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Colores</h2>
                  <p className="text-[10px] text-gray-500 font-bold tracking-tight">Paleta de la marca</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Primary Color */}
                <div>
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                    Color Primario
                  </Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-14 h-11 rounded-xl cursor-pointer border border-gray-700 bg-transparent p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="bg-black/40 border-gray-800/50 text-white h-11 rounded-xl font-mono"
                      placeholder="#4b0082"
                    />
                  </div>
                </div>
                {/* Accent Color */}
                <div>
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                    Color de Acento
                  </Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-14 h-11 rounded-xl cursor-pointer border border-gray-700 bg-transparent p-1"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="bg-black/40 border-gray-800/50 text-white h-11 rounded-xl font-mono"
                      placeholder="#FFD100"
                    />
                  </div>
                </div>
                {/* Surface Color */}
                <div>
                  <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                    Color de Superficie
                    {surfaceColor && <span className="text-gray-600 font-normal normal-case ml-2">(fondo del POS)</span>}
                  </Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={surfaceColor || '#4b0082'}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      className="w-14 h-11 rounded-xl cursor-pointer border border-gray-700 bg-transparent p-1"
                    />
                    <Input
                      value={surfaceColor}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      placeholder="Usar color primario"
                      className="bg-black/40 border-gray-800/50 text-white h-11 rounded-xl font-mono"
                    />
                    {surfaceColor && (
                      <button
                        onClick={() => setSurfaceColor('')}
                        className="px-3 h-11 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all text-xs font-bold uppercase tracking-wider"
                      >
                        Default
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5 font-bold tracking-tight">
                    Define el tono de los fondos del POS. Déjalo vacío para usar el color primario con baja saturación.
                  </p>
                </div>
              </div>

              {/* Color Preview Swatches */}
              <div className="p-4 bg-black/40 rounded-xl flex gap-4 items-center">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-xl border-2 border-gray-800/50 shadow-lg" style={{ backgroundColor: primaryColor }} />
                  <div className="w-10 h-10 rounded-xl border-2 border-gray-800/50 shadow-lg" style={{ backgroundColor: accentColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-2 rounded-full overflow-hidden flex">
                    <div className="h-full" style={{ width: '60%', backgroundColor: primaryColor }} />
                    <div className="h-full" style={{ width: '40%', backgroundColor: accentColor }} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold mt-2 tracking-tight">
                    {primaryColor} <span className="text-gray-700 mx-1">/</span> {accentColor}
                  </p>
                </div>
              </div>

              {/* Smart Contrast Warnings */}
              {(() => {
                const bgLight = '#ffffff'
                const bgDark = '#0a0a0a'
                const ratioPrimaryLight = getContrastRatio(primaryColor, bgLight)
                const ratioPrimaryDark = getContrastRatio(primaryColor, bgDark)
                const ratioAccentLight = getContrastRatio(accentColor, bgLight)
                const ratingPrimaryLight = getContrastRating(ratioPrimaryLight)
                const ratingPrimaryDark = getContrastRating(ratioPrimaryDark)
                const ratingAccentLight = getContrastRating(ratioAccentLight)

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-brand-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contraste Inteligente WCAG</span>
                    </div>

                    {/* Primary color contrast */}
                    <div className="p-3 rounded-xl bg-black/40 border border-gray-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color Primario — Texto sobre blanco</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          ratingPrimaryLight === 'AAA' && "bg-emerald-500/10 text-emerald-400",
                          ratingPrimaryLight === 'AA' && "bg-emerald-500/10 text-emerald-400",
                          ratingPrimaryLight === 'AA-large' && "bg-amber-500/10 text-amber-400",
                          ratingPrimaryLight === 'fail' && "bg-rose-500/10 text-rose-400",
                        )}>
                          {ratingPrimaryLight === 'AAA' && 'AAA ✓'}
                          {ratingPrimaryLight === 'AA' && 'AA ✓'}
                          {ratingPrimaryLight === 'AA-large' && 'AA (solo texto grande)'}
                          {ratingPrimaryLight === 'fail' && 'INSUFICIENTE ✗'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ratingPrimaryLight === 'fail' ? "bg-rose-500" :
                            ratingPrimaryLight === 'AA-large' ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((ratioPrimaryLight / 21) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1 font-mono">
                        Ratio: {ratioPrimaryLight.toFixed(2)}:1
                        {ratingPrimaryLight === 'fail' && ` — Prueba con un tono más oscuro`}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color Primario — Texto sobre fondo oscuro</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          ratingPrimaryDark === 'AAA' && "bg-emerald-500/10 text-emerald-400",
                          ratingPrimaryDark === 'AA' && "bg-emerald-500/10 text-emerald-400",
                          ratingPrimaryDark === 'AA-large' && "bg-amber-500/10 text-amber-400",
                          ratingPrimaryDark === 'fail' && "bg-rose-500/10 text-rose-400",
                        )}>
                          {ratingPrimaryDark === 'AAA' && 'AAA ✓'}
                          {ratingPrimaryDark === 'AA' && 'AA ✓'}
                          {ratingPrimaryDark === 'AA-large' && 'AA (solo texto grande)'}
                          {ratingPrimaryDark === 'fail' && 'INSUFICIENTE ✗'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden mt-1">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ratingPrimaryDark === 'fail' ? "bg-rose-500" :
                            ratingPrimaryDark === 'AA-large' ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((ratioPrimaryDark / 21) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1 font-mono">
                        Ratio: {ratioPrimaryDark.toFixed(2)}:1
                        {ratingPrimaryDark === 'fail' && ` — Prueba con un tono más claro`}
                      </p>
                    </div>

                    {/* Accent color contrast */}
                    <div className="p-3 rounded-xl bg-black/40 border border-gray-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color de Acento — Texto sobre blanco</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                          ratingAccentLight === 'AAA' && "bg-emerald-500/10 text-emerald-400",
                          ratingAccentLight === 'AA' && "bg-emerald-500/10 text-emerald-400",
                          ratingAccentLight === 'AA-large' && "bg-amber-500/10 text-amber-400",
                          ratingAccentLight === 'fail' && "bg-rose-500/10 text-rose-400",
                        )}>
                          {ratingAccentLight === 'AAA' && 'AAA ✓'}
                          {ratingAccentLight === 'AA' && 'AA ✓'}
                          {ratingAccentLight === 'AA-large' && 'AA (solo texto grande)'}
                          {ratingAccentLight === 'fail' && 'INSUFICIENTE ✗'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            ratingAccentLight === 'fail' ? "bg-rose-500" :
                            ratingAccentLight === 'AA-large' ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((ratioAccentLight / 21) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1 font-mono">
                        Ratio: {ratioAccentLight.toFixed(2)}:1
                        {ratingAccentLight === 'fail' && ` — Prueba con un tono más oscuro`}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Card>

          {/* Branding del Negocio Section (replaces White Label) */}
          <Card className={cn(
            "bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/60 backdrop-blur-xl rounded-2xl overflow-hidden",
            !isPatagonia && "opacity-80"
          )}>
            <div className="p-6 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center border",
                  isPatagonia
                    ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/10"
                    : "bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/10"
                )}>
                  {isPatagonia ? (
                    <Crown className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Branding del Negocio</h2>
                    {isPatagonia && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold tracking-tight">
                    {isPatagonia
                      ? 'Muestra tu marca en el POS'
                      : 'Disponible en plan Patagonia'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {isPatagonia ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">
                      Mostrar marca del negocio en el POS
                    </Label>
                    <p className="text-[10px] text-gray-600">
                      Tu logo y nombre reemplazarán &quot;YAHPOS!&quot; en el sidebar y header del POS
                    </p>
                    <p className="text-[9px] text-gray-700 mt-2 font-bold tracking-tight">
                      Powered by YAHPOS! siempre visible
                    </p>
                  </div>
                  <Switch
                    checked={brandingEnabled}
                    onCheckedChange={setBrandingEnabled}
                    className="data-[state=checked]:bg-brand-600"
                  />
                </div>
              ) : (
                <div className="p-4 bg-gray-800/20 rounded-xl border border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Actualiza a Patagonia
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Branding personalizado y más funciones premium
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                      asChild
                    >
                      <a href="/admin/configuracion?tab=billing">
                        Mejorar Plan
                        <ExternalLink className="w-3 h-3 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Live Preview</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* POS Sidebar Preview */}
            <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/60 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">POS Sidebar</span>
              </div>
              <div className="p-6 flex justify-center">
                <div
                  className="w-48 p-5 rounded-2xl border-2 transition-all duration-300 shadow-xl"
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: accentColor,
                  }}
                >
                  <Image
                    src={displayLogo}
                    alt="Logo"
                    width={displayLogoSize.width}
                    height={displayLogoSize.height}
                    unoptimized
                    className="h-8 mb-4 w-auto object-contain brightness-0 invert"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <p className="text-white text-xs font-bold tracking-tight">
                    {brandingEnabled && isPatagonia ? storeName || 'Mi Tienda' : 'YAHPOS!'}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="h-2 rounded-full bg-white/20" />
                    <div className="h-2 rounded-full bg-white/20 w-3/4" />
                    <div className="h-2 rounded-full bg-white/20 w-1/2" />
                    <div className="h-2 rounded-full bg-white/20 w-5/6" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md" style={{ backgroundColor: accentColor }} />
                    <span className="text-[8px] text-white/60 uppercase tracking-widest font-bold">Menu</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/10 text-[8px] text-white/40 text-center font-bold">
                    Powered by YAHPOS!
                  </div>
                </div>
              </div>
            </Card>

            {/* Header Preview */}
            <Card className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border-gray-800/60 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800/40">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Header</span>
              </div>
              <div className="p-6">
                <div
                  className="h-14 rounded-xl flex items-center px-4 gap-3 transition-all duration-300 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Image
                    src={displayLogo}
                    alt="Logo"
                    width={displayLogoSize.width}
                    height={displayLogoSize.height}
                    unoptimized
                    className="h-5 w-auto object-contain brightness-0 invert"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">
                    {brandingEnabled && isPatagonia ? storeName || 'Mi Tienda' : 'YAHPOS!'}
                  </span>
                  <div className="flex-1" />
                  <div className="text-[7px] text-white/30 font-bold">Powered by YAHPOS!</div>
                </div>
              </div>
            </Card>

            {/* Footer */}
            <p className="text-[10px] text-gray-600 text-center font-bold tracking-tight">
              Powered by YAHPOS! — Los cambios se guardan manualmente con el botón &quot;Guardar Cambios&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
