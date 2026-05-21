import React from 'react';
import CatalogViewer from './CatalogViewer';
import { Database, LayoutGrid } from 'lucide-react';

export const metadata = {
  title: 'Master Catalog | Developer Dashboard',
  description: 'Visualización del catálogo maestro de productos recolectados.',
};

export default function CatalogPage() {
  return (
    <main className="min-h-screen bg-brand-900 selection:bg-brand-primary/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Breadcrumb / Navigation */}
        <div className="flex items-center gap-2 text-sm text-white/40 mb-2">
          <span>Developer Console</span>
          <span>/</span>
          <span className="text-brand-primary font-medium">Master Catalog</span>
        </div>

        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-brand-primary/20 rounded-3xl border border-brand-primary/30 text-brand-primary shadow-glow">
              <Database size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Catálogo <span className="text-brand-primary">Maestro</span>
              </h1>
              <p className="text-white/40">Visualiza y gestiona la base de datos de productos precargada para clientes.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-xs font-medium text-white/60">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Database Online
            </div>
          </div>
        </div>

        {/* The Viewer */}
        <CatalogViewer />

        {/* Footer info for meetings */}
        <div className="mt-12 p-6 bg-white/5 border border-white/5 rounded-3xl text-center space-y-2">
          <p className="text-sm text-white/40 italic">
            "Este catálogo representa la base de datos estándar de YAHPOS! para el retail chileno."
          </p>
          <p className="text-xs text-white/20">
            Los datos mostrados están enlazados dinámicamente y se actualizan mediante el pipeline de scraping automatizado.
          </p>
        </div>
      </div>
    </main>
  );
}
