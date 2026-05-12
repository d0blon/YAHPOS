'use client'

import React, { useState } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isDeveloperRoute = pathname?.includes('/developer')

  return (
    <div className="min-h-screen flex bg-[#0a0a0c] text-white selection:bg-purple-500/30 transition-colors duration-500">
      {/* Sidebar - Fixed on Large Screens - Hidden in Developer Route */}
      {!isDeveloperRoute && (
        <div 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto",
            "bg-black/40 backdrop-blur-xl border-r border-white/5",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <AdminSidebar activePath={pathname} />
        </div>
      )}

      {/* Overlay for Mobile Sidebar */}
      {!isDeveloperRoute && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Render header ONLY if not in developer route for total clean look */}
        {!isDeveloperRoute && (
          <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
        )}
        
        <main className={cn(
          "flex-1 pb-12 overflow-x-hidden transition-all duration-500",
          !isDeveloperRoute ? "pt-24 px-4 md:px-8" : "pt-0 px-0"
        )}>
          <div className={cn(
            "mx-auto animate-fade-in",
            !isDeveloperRoute ? "max-w-7xl mt-4" : "max-w-full"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
