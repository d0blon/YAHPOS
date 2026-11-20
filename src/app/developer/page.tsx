import { cookies } from 'next/headers'
import DeveloperPanel from './DeveloperPanel'
import LockScreen from './LockScreen'
import { getStoresWithStatusAction } from './actions/stores'
import { Store } from '@/types'
import { verifyDevToken } from '@/lib/dev-auth'

export const metadata = {
  title: 'Developer Console | YAHPOS!',
  description: 'Advanced system diagnostic and configuration tools for developers.'
}

export default async function DeveloperPage() {
  const cookieStore = await cookies()
  const isUnlocked = verifyDevToken(cookieStore.get('dev_token')?.value)

  if (!isUnlocked) {
    return <LockScreen />
  }

  const stores = await getStoresWithStatusAction() as Store[]

  return (
    <div className="animate-fade-in pb-12">
      <DeveloperPanel initialSettings={stores} />
    </div>
  )
}
