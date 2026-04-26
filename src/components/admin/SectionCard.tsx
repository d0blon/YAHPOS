'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  children: React.ReactNode
  className?: string
}

export function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div className={cn(
      "glass-card border-none overflow-hidden group animate-fade-in",
      className
    )}>
      {children}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ElementType
  actions?: React.ReactNode
}

export function SectionHeader({ title, subtitle, icon: Icon, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
          {Icon && <Icon className="w-8 h-8 text-corporate-blue" />}
          {title.split(' ').map((word, i) => (
            i === title.split(' ').length - 1 ? (
              <span key={i} className="text-corporate-blue">{word}</span>
            ) : (
              <span key={i}>{word} </span>
            )
          ))}
        </h1>
        {subtitle && <p className="text-gray-500 text-sm font-medium mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}
