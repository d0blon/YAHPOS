'use client'

import { useEditor } from '@/providers/EditorProvider'
import { useState } from 'react'

interface EditableTextProps {
  /** Dot-path to the field, e.g. "hero.badge" */
  field: string
  /** Rendered value (from content object) */
  value: string
  /** Optional extra className for the wrapper span */
  className?: string
  /** Inline (default) or block */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'div'
}

/**
 * Renders text that becomes an inline editor when Editor Mode is ON.
 * Usage:
 *   <EditableText field="hero.badge" value={content.hero.badge} className="..." />
 */
export function EditableText({ field, value, className = '', as: Tag = 'span' }: EditableTextProps) {
  const { isEditorMode, updateField } = useEditor()
  const [isFocused, setIsFocused] = useState(false)

  if (!isEditorMode) {
    // Normal render — zero overhead
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        setIsFocused(false)
        const newVal = (e.currentTarget as HTMLElement).innerText.trim()
        if (newVal !== value) updateField(field, newVal)
      }}
      onKeyDown={(e) => {
        // Confirm edit on Enter (single line fields)
        if (e.key === 'Enter' && Tag !== 'div' && Tag !== 'p') {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
        // Cancel on Escape
        if (e.key === 'Escape') {
          ;(e.currentTarget as HTMLElement).innerText = value
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      className={[
        className,
        'outline-none cursor-text relative transition-all duration-200',
        isFocused
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent rounded-sm bg-blue-500/10 px-1'
          : 'ring-2 ring-blue-400/50 ring-offset-1 ring-offset-transparent rounded-sm hover:ring-blue-400 hover:bg-white/5 px-0.5',
      ].join(' ')}
      title={`Editar: ${field}`}
    >
      {value}
    </Tag>
  )
}
