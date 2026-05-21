'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Package, Tag, Info, ChevronLeft, ChevronRight, BarChart3, Database, AlertCircle } from 'lucide-react';

interface Product {
  name: string;
  sku: string;
  brand: string;
  price: number;
  category_main: string;
  images: string[];
  specs?: Record<string, string>;
  nutrition?: { table: Record<string, { per100: string; perServing: string }> };
}

export default function CatalogViewer() {
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas las Categorías');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 500;

  // Load Data
  useEffect(() => {
    console.log('CatalogViewer: Iniciando fetch de /data/catalog.json');
    fetch('/data/catalog.json')
      .then(res => {
        if (!res.ok) throw new Error(`No se pudo cargar el catálogo (HTTP ${res.status})`);
        return res.json();
      })
      .then(data => {
        console.log(`CatalogViewer: Carga exitosa. ${data.length} productos.`);
        if (!Array.isArray(data)) throw new Error('El archivo JSON no contiene un array de productos.');
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('CatalogViewer: Error crítico:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category_main).filter(Boolean));
    return ['Todas las Categorías', ...Array.from(cats).sort()];
  }, [products]);

  // Filter Products
  const allFilteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                            (p.sku || '').toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === 'Todas las Categorías' || p.category_main === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  // Stats
  const stats = useMemo(() => {
    const brands = new Set(products.map(p => p.brand).filter(Boolean));
    return {
      total: products.length,
      filtered: allFilteredProducts.length,
      categories: categories.length - 1,
      brands: brands.size
    };
  }, [products, categories, allFilteredProducts]);

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(allFilteredProducts.length / itemsPerPage));
  
  const filteredProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allFilteredProducts.slice(start, start + itemsPerPage);
  }, [allFilteredProducts, currentPage]);

  // Loading View
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white/60">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse font-medium">Sincronizando Catálogo Maestro...</p>
        <p className="text-xs mt-2 opacity-40 italic">Esto puede tardar unos segundos debido al volumen de datos (1.7k+)</p>
      </div>
    );
  }

  // Error View
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="mx-auto text-red-500" size={48} />
        <h3 className="text-xl font-bold text-white">Error al cargar el catálogo</h3>
        <p className="text-white/60 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl transition-all text-sm font-bold"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Resultados / Total', value: `${stats.filtered.toLocaleString()} / ${stats.total.toLocaleString()}`, icon: Database, color: 'text-brand-primary' },
          { label: 'Categorías', value: stats.categories, icon: Tag, color: 'text-accent-gold' },
          { label: 'Marcas Únicas', value: stats.brands, icon: Package, color: 'text-green-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-glass border border-white/10 p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-white/40">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls Container */}
      <div className="bg-white/5 backdrop-blur-glass border border-white/10 p-6 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..."
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-brand-primary transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary min-w-[200px] cursor-pointer"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat} className="bg-brand-900 text-white">{cat}</option>)}
          </select>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="text-sm text-white/40">
              Mostrando <span className="text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-white font-bold">{Math.min(currentPage * itemsPerPage, stats.filtered)}</span> de <span className="text-white font-bold">{stats.filtered.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  document.querySelector('.product-grid-scroll')?.scrollTo(0, 0);
                }}
                className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} /> Anterior
              </button>
              <div className="bg-brand-primary/10 px-4 py-2 rounded-xl border border-brand-primary/20 text-sm font-bold min-w-[120px] text-center text-brand-primary">
                Página {currentPage} de {totalPages}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  document.querySelector('.product-grid-scroll')?.scrollTo(0, 0);
                }}
                className="flex items-center gap-1 px-4 py-2 bg-brand-primary border border-brand-primary/50 rounded-xl hover:bg-brand-primary/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                Siguiente <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="product-grid-scroll grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p, i) => (
              <div 
                key={`${p.sku}-${i}`} 
                onClick={() => setSelectedProduct(p)}
                className="group bg-white/5 border border-white/5 hover:border-brand-primary/50 p-3 rounded-2xl cursor-pointer transition-all hover:bg-white/10 flex flex-col h-full"
              >
                <div className="aspect-square rounded-xl bg-black/20 mb-3 overflow-hidden border border-white/5">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10"><Package size={40} /></div>
                  )}
                </div>
                <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mb-1 opacity-60">{p.brand || 'Genérico'}</p>
                <h3 className="text-sm font-medium leading-tight h-10 overflow-hidden line-clamp-2 mb-2 group-hover:text-brand-primary transition-colors">{p.name}</h3>
                <div className="mt-auto flex justify-between items-center text-[11px] text-white/40 border-t border-white/5 pt-2">
                  <span className="font-mono">SKU: {p.sku || 'N/A'}</span>
                  <span className="text-accent-gold font-bold text-sm">${p.price.toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-2 opacity-40">
              <Search size={48} className="mx-auto mb-4" />
              <p className="text-xl font-bold">No se encontraron productos</p>
              <p>Prueba ajustando la búsqueda o la categoría</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedProduct(null)}>
          <div className="bg-brand-900 border border-white/10 w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            {/* Header Content */}
            <div className="flex gap-8 flex-col md:flex-row mb-8">
              <div className="w-full md:w-1/2 aspect-square bg-black/40 rounded-3xl p-6 border border-white/5 shadow-inner">
                <img src={selectedProduct.images?.[0]} className="w-full h-full object-contain" alt={selectedProduct.name} />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-brand-primary font-bold tracking-widest text-sm uppercase">{selectedProduct.brand}</p>
                <h2 className="text-2xl font-bold leading-tight">{selectedProduct.name}</h2>
                <div className="inline-flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Precio Distribuidor</span>
                  <div className="text-3xl font-bold text-accent-gold">
                    ${selectedProduct.price.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-bold uppercase tracking-tighter">SKU Oficial</span>
                    <span className="font-mono text-brand-primary">{selectedProduct.sku}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-bold uppercase tracking-tighter">Categoría</span>
                    <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded text-[10px]">{selectedProduct.category_main}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs / Info Blocks */}
            <div className="space-y-6">
              {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 && (
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <h4 className="flex items-center gap-2 text-sm font-bold mb-4 uppercase tracking-widest text-white/60">
                    <Info size={16} className="text-brand-primary" /> Especificaciones Técnicas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    {Object.entries(selectedProduct.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-white/40">{k}</span>
                        <span className="text-white/80 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.nutrition?.table && Object.keys(selectedProduct.nutrition.table).length > 0 && (
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <h4 className="flex items-center gap-2 text-sm font-bold mb-4 uppercase tracking-widest text-white/60">
                    <BarChart3 size={16} className="text-green-400" /> Información Nutricional
                  </h4>
                  <div className="overflow-hidden rounded-2xl border border-white/5">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-white/10 text-white/60">
                          <th className="p-3 text-left">Nutriente</th>
                          <th className="p-3 text-center">Por 100g/ml</th>
                          <th className="p-3 text-center">Por Porción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {Object.entries(selectedProduct.nutrition.table).map(([nut, val]) => (
                          <tr key={nut} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-medium text-white/80">{nut}</td>
                            <td className="p-3 text-center text-white/40">{val.per100}</td>
                            <td className="p-3 text-center text-white/40">{val.perServing}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <button 
              className="w-full mt-8 bg-brand-primary py-4 rounded-2xl font-bold hover:bg-brand-primary/80 transition-all shadow-lg shadow-brand-primary/20"
              onClick={() => setSelectedProduct(null)}
            >
              Cerrar Detalle del Producto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
