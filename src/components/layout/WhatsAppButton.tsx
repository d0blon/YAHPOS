"use client";

import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const phoneNumber = "56912345678"; // Placeholder
  const message = "Hola! Vengo desde el E-commerce y necesito ayuda.";
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[100] group"
    >
      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
      <div className="relative w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-white/20 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 active:scale-95">
        <MessageCircle className="w-8 h-8 md:w-10 md:h-10 fill-current" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-4 px-4 py-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <p className="text-white text-xs font-black uppercase tracking-widest">¿Necesitas ayuda?</p>
        </div>
      </div>
    </a>
  );
}
