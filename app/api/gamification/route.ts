import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/gamification — fetch current user's XP, streak, badges
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('xp, streak_days, last_submission_date')
    .eq('id', user.id)
    .single()

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_type, earned_at')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: true })

  return NextResponse.json({
    xp: profile?.xp ?? 0,
    streak_days: profile?.streak_days ?? 0,
    badges: badges ?? [],
  })
}
