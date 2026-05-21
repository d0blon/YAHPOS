"use client";

import { ShieldCheck, Truck, Store, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const trustItems = [
  {
    icon: ShieldCheck,
    title: "PAGO SEGURO",
    description: "Transbank, GetNet, SumUp",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10"
  },
  {
    icon: Truck,
    title: "DESPACHO RÁPIDO",
    description: "Castro y alrededores",
    color: "text-brand-accent-400",
    bgColor: "bg-brand-accent-500/10"
  },
  {
    icon: Store,
    title: "RETIRO EN TIENDA",
    description: "Listo en 30 minutos",
    color: "text-brand-400",
    bgColor: "bg-brand-500/10"
  },
  {
    icon: CreditCard,
    title: "MEDIOS LOCALES",
    description: "TUU, Redcompra, Efectivo",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10"
  }
];

export default function TrustStrip() {
  return (
    <div className="w-full bg-black/40 backdrop-blur-xl border-y border-white/5 py-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {trustItems.map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-center md:items-start gap-4 group">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                item.bgColor
              )}>
                <item.icon className={cn("w-6 h-6", item.color)} />
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">
                  {item.title}
                </h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
