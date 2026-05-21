'use client'

import React, { useState } from 'react'
import { X, Check, Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Product } from '@/types'

interface WeightInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (weight: number) => void
  product: Product | null
}

export function WeightInputModal({ isOpen, onClose, onConfirm, product }: WeightInputModalProps) {
  const [weight, setWeight] = useState('0')

  if (!isOpen || !product) return null

  const handleKeyPress = (num: string) => {
    if (weight === '0' && num !== '.') {
      setWeight(num)
    } else {
      setWeight(weight + num)
    }
  }

  const handleDelete = () => {
    if (weight.length > 1) {
      setWeight(weight.slice(0, -1))
    } else {
      setWeight('0')
    }
  }

  const handleConfirm = () => {
    const val = parseFloat(weight)
    if (val > 0) {
      onConfirm(val)
      setWeight('0')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">Entrada de Pesaje (Balanza)</h3>
            <h2 className="text-3xl font-black text-gray-900 leading-tight">{product.name}</h2>
            <p className="text-brand-primary font-bold mt-1">Precio x kg: ${product.price.toLocaleString('es-CL')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-8 h-8 text-gray-400" />
          </button>
        </div>

        {/* Display */}
        <div className="mx-8 mb-6 p-6 bg-gray-50 rounded-3xl border-2 border-transparent focus-within:border-brand-primary transition-all flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-brand-primary tabular-nums">{weight}</span>
            <span className="text-2xl font-bold text-gray-400">kg</span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 w-full text-center">
            <p className="text-sm font-bold text-gray-500 uppercase">Subtotal Estimado</p>
            <p className="text-2xl font-black text-gray-900">
              ${(parseFloat(weight) * product.price).toLocaleString('es-CL')}
            </p>
          </div>
        </div>

        {/* Keypad */}
        <div className="p-8 grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(val => (
            <button 
              key={val}
              onClick={() => handleKeyPress(val.toString())}
              className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-2xl font-bold text-gray-700 active:bg-brand-primary/10"
            >
              {val}
            </button>
          ))}
          <button 
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-500 flex items-center justify-center"
          >
            <Delete className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => setWeight('1.0')}
            className="col-span-1 h-14 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50 text-gray-500"
          >
            +1.0 kg
          </button>
          <button 
            onClick={() => setWeight((prev) => (parseFloat(prev || '0') + 0.1).toFixed(3))}
            className="col-span-1 h-14 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50 text-gray-500"
          >
            +100g
          </button>
          <Button 
            onClick={handleConfirm}
            className="col-span-1 h-14 bg-brand-primary hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6" /> LISTO
          </Button>
        </div>
      </div>
    </div>
  )
}
