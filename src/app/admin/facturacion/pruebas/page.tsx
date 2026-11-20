import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import { roleIn, SII_MANAGEMENT_ROLES } from '@/lib/constants/roles'
import { PruebasSiiPanel } from './components/PruebasSiiPanel'

export const metadata: Metadata = {
  title: 'Set de pruebas SII | YAHPOS!',
  description: 'Verificación de emisión y envío real de DTE al SII con el CAF de la tienda.',
}

export default async function PruebasSiiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin/facturacion/pruebas')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', user.id)
    .maybeSingle()

  const rolesPermitidos = [...SII_MANAGEMENT_ROLES, 'superadmin'] as const
  if (!profile || !roleIn(profile.role, rolesPermitidos)) redirect('/?error=unauthorized')

  return <PruebasSiiPanel storeId={profile.store_id ?? ''} />
}
