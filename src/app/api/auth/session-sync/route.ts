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

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(`${origin}/login?error=sync_missing_tokens`)
  }

  const secure = protocol === 'https'
  const setCookieHeaders: string[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options }
            const cookieParts = [`${name}=${value}`]
            cookieParts.push(`Path=${opts.path || '/'}`)
            if (opts.maxAge !== undefined) {
              cookieParts.push(`Max-Age=${opts.maxAge}`)
            }
            if (opts.domain) {
              cookieParts.push(`Domain=${opts.domain}`)
            }
            cookieParts.push(`SameSite=${opts.sameSite || 'Lax'}`)
            if (secure) {
              cookieParts.push('Secure')
            }
            cookieParts.push('HttpOnly')
            setCookieHeaders.push(cookieParts.join('; '))
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
    return NextResponse.redirect(`${origin}/login?error=sync_failed`)
  }

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

  for (const cookie of setCookieHeaders) {
    response.headers.append('Set-Cookie', cookie)
  }

  return response
}
