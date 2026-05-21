import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')
  let next = requestUrl.searchParams.get('next') || '/admin'
  // Sanitizar: eliminar trailing dots del path
  next = next.replace(/\.+$/, '')

  const host = request.headers.get('host') || ''
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  console.log(`[Session Sync Log] GET request. Host: ${host}, Origin: ${origin}, Next: ${next}`)

  if (!accessToken || !refreshToken) {
    console.error(`[Session Sync Log] Missing tokens. Access: ${!!accessToken}, Refresh: ${!!refreshToken}`)
    return NextResponse.redirect(`${origin}/login?error=sync_missing_tokens`)
  }

  const secure = protocol === 'https'
  const cookiesToSetArray: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          console.log(`[Session Sync Log] cookiesToSet count: ${cookiesToSet.length}`)
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSetArray.push({ name, value, options })
          })
        },
      },
      cookieOptions: {
        secure: secure,
        sameSite: 'lax',
        path: '/',
      }
    }
  )

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error || !data.session) {
    console.error(`[Session Sync Log] setSession error:`, error?.message || 'No session returned')
    return NextResponse.redirect(`${origin}/login?error=sync_failed`)
  }

  console.log(`[Session Sync Log] setSession SUCCESS for: ${data.session.user.email}. Redirecting to: ${next}`)

  const redirectTo = `${origin}${next.startsWith('/') ? next : '/' + next}`

  const body = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Redirigiendo...</title>
</head><body>
  <script>
    setTimeout(function() {
      window.location.replace(${JSON.stringify(redirectTo)});
    }, 100);
  </script>
</body></html>`

  const response = new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })

  cookiesToSetArray.forEach(({ name, value, options }) => {
    const opts = {
      ...options,
      secure: secure,
      sameSite: 'lax' as const,
      path: '/',
    }
    console.log(`[Session Sync Log] Setting cookie via response.cookies: ${name} | Options:`, opts)
    response.cookies.set(name, value, opts)
  })

  return response
}
