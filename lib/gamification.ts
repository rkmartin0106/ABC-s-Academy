// ─── Server-only — uses Supabase admin client ─────────────────────────────────
import { createSupabaseAdminClient } from './supabase'
import { xpForScore, type BadgeType } from './gamification-config'

export { getLevelInfo, xpForScore, BADGE_CONFIG, XP_LEVELS, type BadgeType } from './gamification-config'

export async function processSubmission(studentId: string, score: number) {
  const admin = createSupabaseAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('xp, streak_days, last_submission_date')
    .eq('id', studentId)
    .single()

  if (!user) return null

  // ── Streak ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  const last = user.last_submission_date as string | null
  let streak = (user.streak_days as number) ?? 0

  if (!last) {
    streak = 1
  } else {
    const daysDiff = Math.floor(
      (new Date(today).getTime() - new Date(last).getTime()) / 86400000
    )
    if (daysDiff === 0) {
      // same day - no change
    } else if (daysDiff === 1) {
      streak += 1
    } else {
      streak = 1
    }
  }

  // ── XP ────────────────────────────────────────────────────
  const earnedXp = xpForScore(score)
  const newXp = ((user.xp as number) ?? 0) + earnedXp

  await admin
    .from('users')
    .update({ xp: newXp, streak_days: streak, last_submission_date: today })
    .eq('id', studentId)

  // ── Count total submitted ─────────────────────────────────
  const { count: totalSubmitted } = await admin
    .from('student_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('status', 'submitted')

  // ── Badges ────────────────────────────────────────────────
  const { data: existingBadges } = await admin
    .from('user_badges')
    .select('badge_type')
    .eq('user_id', studentId)

  const earnedSet = new Set((existingBadges ?? []).map((b: { badge_type: string }) => b.badge_type))
  const toAward: BadgeType[] = []

  if (!earnedSet.has('first_homework') && (totalSubmitted ?? 0) >= 1)  toAward.push('first_homework')
  if (!earnedSet.has('perfect_score')  && score >= 100)                 toAward.push('perfect_score')
  if (!earnedSet.has('streak_7')       && streak >= 7)                  toAward.push('streak_7')
  if (!earnedSet.has('completionist')  && (totalSubmitted ?? 0) >= 10)  toAward.push('completionist')

  if (toAward.length > 0) {
    await admin.from('user_badges').insert(
      toAward.map(badge_type => ({ user_id: studentId, badge_type }))
    )
  }

  return { earnedXp, newXp, streak, newBadges: toAward }
}
