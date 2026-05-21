/**
 * AuthLayout — Layout limpio para páginas de autenticación
 *
 * No incluye Header ni Footer intencionalmente:
 * el foco debe estar 100% en el formulario de login/registro.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen relative flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* Premium Aurora Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob 1 - Top Left */}
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-600/40 dark:bg-blue-600/40 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        
        {/* Blob 2 - Bottom Right */}
        <div className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-brand-600/40 dark:bg-brand-600/40 blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
        
        {/* Blob 3 - Center Right */}
        <div className="absolute top-[20%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-emerald-500/30 dark:bg-emerald-500/30 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        
        {/* Noise overlay to give it texture without washing out colors */}
        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
      </div>

      <div className="flex-1 relative z-10 flex flex-col">
        {children}
      </div>
    </main>
  )
}
