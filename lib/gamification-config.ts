// ─── Pure config — safe to import in client components ────────────────────────

export const XP_LEVELS = [
  { level: 1, title: 'Beginner',  minXp: 0 },
  { level: 2, title: 'Explorer',  minXp: 100 },
  { level: 3, title: 'Achiever',  minXp: 300 },
  { level: 4, title: 'Scholar',   minXp: 700 },
  { level: 5, title: 'Master',    minXp: 1500 },
]

export function getLevelInfo(xp: number) {
  let current = XP_LEVELS[0]
  let next = XP_LEVELS[1]
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].minXp) {
      current = XP_LEVELS[i]
      next = XP_LEVELS[i + 1] ?? null!
    }
  }
  const progressXp = xp - current.minXp
  const totalXp = next ? next.minXp - current.minXp : 0
  const progressPct = next ? Math.min(100, Math.round((progressXp / totalXp) * 100)) : 100
  return { current, next: next ?? null, progressXp, totalXp, progressPct }
}

export function xpForScore(score: number): number {
  const base = Math.round(score)
  const bonus = score >= 100 ? 25 : score >= 90 ? 10 : 0
  return base + bonus
}

export type BadgeType = 'first_homework' | 'perfect_score' | 'streak_7' | 'completionist'

export const BADGE_CONFIG: Record<BadgeType, { label: string; description: string; emoji: string }> = {
  first_homework: { emoji: '📝', label: 'First Homework',  description: 'Submitted your first homework' },
  perfect_score:  { emoji: '⭐', label: 'Perfect Score',   description: 'Scored 100% on a homework' },
  streak_7:       { emoji: '🔥', label: '7-Day Streak',    description: 'Submitted homework 7 days in a row' },
  completionist:  { emoji: '🏆', label: 'Completionist',   description: 'Completed 10 assignments' },
}
