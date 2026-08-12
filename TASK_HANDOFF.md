---
status: closed
goal: "P2 — dropdown de sugerencias en vivo bajo la barra de búsqueda (nombre + imagen), con debounce"
branch: "main"
created: 2026-08-12
updated: 2026-08-12
requires-plan: false
zona-roja: false
---

## ✅ CERRADO — verificado por el Arquitecto (2026-08-12)

`npx tsc --noEmit -p .` corrido de forma independiente: cero errores. `Header.tsx` leído
completo — matchea el spec exacto, nada más del archivo tocado. **No se pudo confirmar
visualmente el dropdown en vivo** — el header de este sitio se monta vía
`requestAnimationFrame` (patrón preexistente, no tocado hoy) que los navegadores pausan en
pestañas sin foco/visibilidad; el panel del navegador de esta sesión no estaba compuesto/visible
(mismo motivo por el que un screenshot falló antes en la sesión), así que `mounted` nunca pasó
a `true` y el `<header>` no apareció en el DOM pese a que el HTML/JS es correcto. Confirmado que
NO es un bug de código: la lógica reutiliza `getProducts(undefined, undefined, term)`, ya
probada y funcionando hoy para la búsqueda completa. **Confirmado por el usuario en vivo (2026-08-12): funciona perfecto ("de 10").**

## Contexto

Pedido del usuario tras probar la búsqueda de hoy: mientras escribe en la barra de búsqueda del
header, quiere ver un dropdown con productos que matcheen (nombre + imagen), no solo tener que
apretar Enter para ir a `/buscar`. La búsqueda en sí (`/api/products?search=`, la página
`/buscar`) ya está construida y funcionando — esto es una mejora de UX sobre lo mismo, un solo
archivo: `src/components/layout/Header.tsx`.

## Fix

Todo el cambio es en `src/components/layout/Header.tsx`.

### 1. Agregar imports (junto a los existentes, después de la línea `import { useSaaS }...`):
```ts
import { getProducts } from '@/lib/api'
import type { Product } from '@/types'
```

### 2. Agregar un componente pequeño ANTES de `export default function Header()`:
```tsx
function SearchSuggestions({ suggestions, query, onSelect }: { suggestions: Product[]; query: string; onSelect: () => void }) {
  if (suggestions.length === 0) return null
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
      {suggestions.map((product) => (
        <Link
          key={product.id}
          href={`/producto/${product.slug || product.id}`}
          onClick={onSelect}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-hidden shrink-0">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{product.name}</span>
        </Link>
      ))}
      <Link
        href={`/buscar?q=${encodeURIComponent(query)}`}
        onClick={onSelect}
        className="block px-4 py-2.5 text-center text-xs font-black uppercase tracking-widest text-primary hover:bg-gray-50 dark:hover:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      >
        Ver todos los resultados
      </Link>
    </div>
  )
}
```

### 3. Dentro de `Header()`, junto a los `useState`/handlers de búsqueda ya existentes
(`searchTerm`, `handleSearchSubmit`), agregar:
```ts
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    const term = searchTerm.trim()
    if (term.length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await getProducts(undefined, undefined, term)
        setSuggestions(results.slice(0, 6))
      } catch (err) {
        console.error('Error buscando sugerencias:', err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
```
(`useEffect` ya está importado en este archivo, junto a `useState`/`useRef` — no hace falta
tocar ese import.)

### 4. Wirear el dropdown en el `<form>` de escritorio (el que tiene
`className="hidden md:flex flex-1 max-w-2xl header-search relative group"`):

Antes:
```tsx
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl header-search relative group">
             <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="¿Qué necesitas hoy?"
                className="w-full h-11 pl-4 pr-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-sm font-medium outline-none"
             />
             <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
             </button>
          </form>
```
Después:
```tsx
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-2xl header-search relative group">
             <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="¿Qué necesitas hoy?"
                className="w-full h-11 pl-4 pr-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-sm font-medium outline-none"
             />
             <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
             </button>
             {showSuggestions && (
               <SearchSuggestions
                 suggestions={suggestions}
                 query={searchTerm.trim()}
                 onSelect={() => { setShowSuggestions(false); setSearchTerm('') }}
               />
             )}
          </form>
```

### 5. Mismo cambio en el `<form>` móvil (el que tiene `className="md:hidden mt-3 relative group"`):

Antes:
```tsx
        <form onSubmit={handleSearchSubmit} className="md:hidden mt-3 relative group">
           <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="¿Qué necesitas hoy?"
              className="w-full h-10 pl-4 pr-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-xs font-medium outline-none"
           />
           <button type="submit" className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <Search className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
           </button>
        </form>
```
Después:
```tsx
        <form onSubmit={handleSearchSubmit} className="md:hidden mt-3 relative group">
           <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="¿Qué necesitas hoy?"
              className="w-full h-10 pl-4 pr-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-xs font-medium outline-none"
           />
           <button type="submit" className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <Search className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
           </button>
           {showSuggestions && (
             <SearchSuggestions
               suggestions={suggestions}
               query={searchTerm.trim()}
               onSelect={() => { setShowSuggestions(false); setSearchTerm('') }}
             />
           )}
        </form>
```

## Plan de pruebas

- [ ] Escribir 2+ caracteres de un producto real (ej. "atu") en la barra de escritorio → tras
      ~300ms aparece un dropdown con hasta 6 productos, cada uno con imagen + nombre
- [ ] Click en un producto del dropdown → navega a `/producto/[slug]` de ese producto
- [ ] Click en "Ver todos los resultados" → navega a `/buscar?q=...` con el término completo
- [ ] Escribir 1 solo carácter → NO aparece dropdown (mínimo 2 caracteres)
- [ ] Borrar el texto → el dropdown desaparece
- [ ] Hacer click afuera de la barra de búsqueda → el dropdown se cierra
- [ ] Mismo comportamiento en la barra de búsqueda móvil
- [ ] Presionar Enter (con o sin dropdown abierto) sigue navegando a `/buscar?q=...` como antes
- [ ] `npx tsc --noEmit -p .` con salida completa en el Report Back

## Do Not

- No tocar `api/products/route.ts` ni `lib/api.ts` — ya soportan `search`, no hace falta agregar
  paginación ni límite server-side para esto (recortar a 6 client-side alcanza)
- No tocar `(shop)/buscar/page.tsx` — la página de resultados completos queda igual
- No agregar navegación por teclado (flechas arriba/abajo) en el dropdown — fuera de scope para
  esta vuelta, mouse/touch alcanza por ahora
