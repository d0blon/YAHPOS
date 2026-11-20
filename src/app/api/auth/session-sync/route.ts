import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/auth/sso-target'
import { getRequestProtocol } from '@/lib/config/root-domain'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')

  const host = request.headers.get('host') || ''
  const protocol = getRequestProtocol(request.headers)
  const origin = `${protocol}://${host}`
  const next = sanitizeNextPath(requestUrl.searchParams.get('next') ?? '/admin', origin)

  console.log(`[Session Sync Log] GET request. Host: ${host}, Origin: ${origin}, Next: ${next}`)

  if (!accessToken || !refreshToken) {
    console.error(`[Session Sync Log] Missing tokens. Access: ${!!accessToken}, Refresh: ${!!refreshToken}`)
    return NextResponse.redirect(`${origin}/login?error=sync_missing_tokens`)
  }

  const secure = protocol === 'https'
  const cookiesToSetArray: { name: string; value: string; options: CookieOptions }[] = []

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

  console.log('[Session Sync Log] setSession SUCCESS')

  const redirectTo = new URL(next, origin).toString()

  // Route Handler: Next no inyecta el nonce acá. El proxy lo pone en el request.
  const nonce = request.headers.get('x-nonce') ?? ''
  // JSON.stringify escapa comillas pero no `<`/`>`: sin esto, un `next` con
  // `</script>` cerraría el tag inline. Escapar a \u003c/\u003e/\u0026 evita el breakout.
  const safeRedirectTo = JSON.stringify(redirectTo)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  const body = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>Redirigiendo...</title>
</head><body>
  <script nonce="${nonce}">
    setTimeout(function() {
      window.location.replace(${safeRedirectTo});
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
    response.cookies.set(name, value, opts)
  })

  return response
}
