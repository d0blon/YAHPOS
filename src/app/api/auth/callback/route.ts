import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
      }

      const user = data.user
      const hasProfile = user?.user_metadata?.first_name || user?.user_metadata?.full_name

      if (!hasProfile) {
        return NextResponse.redirect(`${origin}/cuenta/completar-perfil?from=google`)
      }

    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      return NextResponse.redirect(`${origin}/login?error=unexpected`)
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
