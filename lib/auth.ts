import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase'
import type { User, UserRole } from '@/types'

// ─── Get current session user ─────────────────────────────────────────────────

export async function getSessionUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return user as User | null
}

// ─── Require auth — redirect to /login if not authenticated ──────────────────

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

// ─── Require a specific role ──────────────────────────────────────────────────

export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireAuth()
  if (user.role !== role) {
    redirect(user.role === 'teacher' ? '/admin' : '/student')
  }
  return user
}

// ─── Role-based redirect after login ─────────────────────────────────────────

export function getDashboardPath(role: UserRole): string {
  return role === 'teacher' ? '/admin' : '/student'
}
