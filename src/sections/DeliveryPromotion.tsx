"use client";

import { Truck, MapPin, Clock } from 'lucide-react';

export default function DeliveryPromotion() {
  return (
    <section className="relative h-full py-10 flex items-center bg-black overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="relative rounded-[4rem] overflow-hidden">
          {/* Main Visual */}
          <div className="absolute inset-0">
            <img 
              src="/delivery_premium_1777248177152.png" 
              alt="Delivery Service" 
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          </div>
          
          <div className="relative z-10 p-12 md:p-24 max-w-3xl">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600 rounded-full mb-8">
              <Truck className="w-4 h-4 text-white" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Servicio Premium</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8 tracking-tighter">
              Llegamos a <br />
              <span className="text-blue-500 italic">todo Castro</span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Despacho ultrarrápido en menos de 60 minutos o programado para cuando tú quieras. Calidad garantizada desde nuestra tienda a tu mesa.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-widest">Exprés</p>
                  <p className="text-gray-500 text-xs font-bold uppercase">Menos de 1 hora</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10">
                  <MapPin className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-widest">Cobertura</p>
                  <p className="text-gray-500 text-xs font-bold uppercase">Sector Urbano y Rural</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
