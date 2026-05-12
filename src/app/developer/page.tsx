import { cookies } from 'next/headers'
import DeveloperPanel from './DeveloperPanel'
import LockScreen from './LockScreen'
import { getStoresWithStatusAction } from './actions'
import { Store } from '@/types'

export const metadata = {
  title: 'Developer Console | YAHPOS!',
  description: 'Advanced system diagnostic and configuration tools for developers.'
}

export default async function DeveloperPage() {
  const stores = await getStoresWithStatusAction() as Store[]

  return (
    <div className="animate-fade-in pb-12">
      <DeveloperPanel initialSettings={stores} />
    </div>
  )
}
