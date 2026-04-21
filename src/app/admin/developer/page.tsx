import { cookies } from 'next/headers'
import DeveloperPanel from './DeveloperPanel'
import LockScreen from './LockScreen'
import { getStoreSettingsAction } from './actions'

export const metadata = {
  title: 'PatagoniaPOS | Developer Mode',
  description: 'Control maestro y gestión de infraestructura SaaS.',
}

export default async function DeveloperPage() {
  const cookieStore = await cookies()
  const devToken = cookieStore.get('dev_token')
  const isAuthenticated = devToken?.value === 'patagonia_dev_active'
  
  const settings = await getStoreSettingsAction()

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/20 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {!isAuthenticated ? (
          <LockScreen />
        ) : (
          <DeveloperPanel initialSettings={settings} />
        )}
      </div>
    </div>
  )
}
