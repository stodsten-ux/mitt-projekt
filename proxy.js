import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Sliding-window rate limiter (in-memory, resets on cold start — acceptabelt för Fas 1)
const rateLimits = new Map()

function checkRateLimit(ip, key, max, windowMs) {
  const now = Date.now()
  const mapKey = key + ip
  const timestamps = (rateLimits.get(mapKey) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= max) return false
  rateLimits.set(mapKey, [...timestamps, now])
  return true
}

export async function proxy(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const path = request.nextUrl.pathname

  if (path.startsWith('/api/ai')) {
    if (!checkRateLimit(ip, 'ai:', 10, 60_000))
      return Response.json(
        { error: 'För många anrop — försök igen om en minut' },
        { status: 429 }
      )
  } else if (path.startsWith('/api/')) {
    if (!checkRateLimit(ip, 'api:', 30, 60_000))
      return Response.json(
        { error: 'För många anrop — försök igen om en minut' },
        { status: 429 }
      )
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
