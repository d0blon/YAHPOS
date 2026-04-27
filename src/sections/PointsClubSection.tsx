"use client";

import { Gift, Star, Zap, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PointsClubSection() {
  return (
    <section className="relative h-full py-10 flex items-center bg-[#030303] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/5 blur-[120px] rounded-full" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-12 md:p-20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-blue-600/30 transition-colors duration-700" />
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-full mb-8 border border-blue-500/20">
                <Star className="w-4 h-4 text-blue-400 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Club de Beneficios</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8 tracking-tighter">
                Únete al Club <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Acumula Puntos</span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-12 max-w-md leading-relaxed">
                Por cada compra que realices, acumulas puntos que puedes canjear por descuentos exclusivos y productos gratis.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <Button className="h-16 px-10 bg-white text-black font-black text-lg rounded-2xl hover:scale-105 transition-all">
                  <UserPlus className="w-5 h-5 mr-3" />
                  REGISTRARME AHORA
                </Button>
                <div className="flex flex-col justify-center">
                  <p className="text-white font-black text-sm uppercase tracking-widest">¿Ya eres socio?</p>
                  <p className="text-blue-400 font-bold text-xs cursor-pointer hover:underline">Consultar mis puntos</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  icon: Gift,
                  title: "Canje Directo",
                  desc: "Usa tus puntos en caja o en el e-commerce",
                  color: "text-emerald-400"
                },
                {
                  icon: Zap,
                  title: "Doble Puntaje",
                  desc: "En productos seleccionados cada semana",
                  color: "text-amber-400"
                },
                {
                  icon: Star,
                  title: "Nivel Elite",
                  desc: "Acceso a ofertas antes que nadie",
                  color: "text-purple-400"
                },
                {
                  icon: Gift,
                  title: "Regalo de Cumple",
                  desc: "Un detalle especial en tu día",
                  color: "text-blue-400"
                }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-2">
                  <item.icon className={`w-10 h-10 ${item.color} mb-6`} />
                  <h4 className="text-lg font-black text-white mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-500 font-medium leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
