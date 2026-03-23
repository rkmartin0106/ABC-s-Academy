import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Paths that never require authentication
const UNPROTECTED_PATHS = ['/api/telegram', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always let API paths through with no auth check
  if (UNPROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Guard: fail open to /login if env vars aren't configured yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname === '/login') return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options })
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options })
        res.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.user_metadata?.role as 'teacher' | 'student' | undefined
  const dashboard = role === 'teacher' ? '/admin' : role === 'student' ? '/student' : null

  // ── /login ────────────────────────────────────────────────────────────────
  // Unauthenticated → show the login page
  // Authenticated   → send to their dashboard (prevents post-login loop)
  if (pathname === '/login') {
    if (!user || !dashboard) return res
    return NextResponse.redirect(new URL(dashboard, req.url))
  }

  // ── Protected routes ──────────────────────────────────────────────────────
  // Not authenticated → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role missing → send to login rather than bouncing between dashboards
  if (!dashboard) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already on the right dashboard → let through
  if (pathname.startsWith(dashboard)) {
    return res
  }

  // On the wrong dashboard → send to the correct one
  if (pathname.startsWith('/admin') || pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL(dashboard, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
