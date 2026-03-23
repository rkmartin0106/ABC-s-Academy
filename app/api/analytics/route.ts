import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/analytics?studentId=<id> — returns analytics for one student
// GET /api/analytics — returns summary analytics for all students (teacher)
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const studentId = req.nextUrl.searchParams.get('studentId')

  if (studentId) {
    return getStudentAnalytics(supabase, studentId)
  }

  return getOverviewAnalytics(supabase)
}

async function getStudentAnalytics(supabase: ReturnType<typeof import('@/lib/supabase').createSupabaseServerClient>, studentId: string) {
  // Score over time
  const { data: submissions } = await supabase
    .from('student_assignments')
    .select('score, submitted_at, assignment:assignments(title, questions)')
    .eq('student_id', studentId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })

  // Build score timeline
  const scoreTimeline = (submissions ?? []).map((s: any) => ({
    date: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    score: Math.round(s.score ?? 0),
    title: s.assignment?.title ?? 'Untitled',
  }))

  // Question type breakdown — analyze answered questions
  const questionTypeStats: Record<string, { correct: number; total: number }> = {
    multiple_choice: { correct: 0, total: 0 },
    fill_in_blank: { correct: 0, total: 0 },
    true_false: { correct: 0, total: 0 },
    matching: { correct: 0, total: 0 },
  }

  for (const s of (submissions ?? []) as any[]) {
    const questions = s.assignment?.questions ?? []
    const answers = s.answers ?? {}
    for (const q of questions) {
      const type = q.type as string
      if (!questionTypeStats[type]) questionTypeStats[type] = { correct: 0, total: 0 }
      questionTypeStats[type].total++
      // Simple correctness check (mirrors grading logic)
      const studentAnswer = answers[q.id]
      let correct = false
      if (q.type === 'fill_in_blank') {
        correct = String(studentAnswer ?? '').trim().toLowerCase() === String(q.correct_answer ?? '').trim().toLowerCase()
      } else if (q.type === 'matching') {
        try {
          const ca = JSON.parse(q.correct_answer)
          const sa = typeof studentAnswer === 'string' ? JSON.parse(studentAnswer) : {}
          correct = Object.keys(ca).every(k => ca[k] === sa[k])
        } catch { correct = false }
      } else {
        correct = String(studentAnswer) === String(q.correct_answer)
      }
      if (correct) questionTypeStats[type].correct++
    }
  }

  const questionBreakdown = Object.entries(questionTypeStats)
    .filter(([, v]) => v.total > 0)
    .map(([type, v]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      correct: v.correct,
      total: v.total,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }))

  // Completion rate
  const { count: assignedTotal } = await supabase
    .from('student_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)

  const completionRate = assignedTotal
    ? Math.round(((submissions?.length ?? 0) / assignedTotal) * 100)
    : 0

  return NextResponse.json({
    scoreTimeline,
    questionBreakdown,
    completionRate,
    totalSubmitted: submissions?.length ?? 0,
    totalAssigned: assignedTotal ?? 0,
    avgScore: scoreTimeline.length
      ? Math.round(scoreTimeline.reduce((s, r) => s + r.score, 0) / scoreTimeline.length)
      : null,
  })
}

async function getOverviewAnalytics(supabase: ReturnType<typeof import('@/lib/supabase').createSupabaseServerClient>) {
  // All submissions with scores grouped by student
  const { data: students } = await supabase
    .from('users')
    .select('id, name, level')
    .eq('role', 'student')

  const { data: allSubmissions } = await supabase
    .from('student_assignments')
    .select('student_id, score, submitted_at')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })

  // Per-student avg scores
  const studentMap = new Map((students ?? []).map((s: any) => [s.id, s]))
  const submissionsByStudent: Record<string, number[]> = {}
  for (const sub of (allSubmissions ?? []) as any[]) {
    if (!submissionsByStudent[sub.student_id]) submissionsByStudent[sub.student_id] = []
    submissionsByStudent[sub.student_id].push(Math.round(sub.score ?? 0))
  }

  const studentAverages = Object.entries(submissionsByStudent).map(([id, scores]) => ({
    name: (studentMap.get(id) as any)?.name ?? 'Unknown',
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  })).sort((a, b) => b.avgScore - a.avgScore)

  // Submissions over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const recentByDay: Record<string, number> = {}
  for (const sub of (allSubmissions ?? []) as any[]) {
    if (!sub.submitted_at) continue
    const d = new Date(sub.submitted_at)
    if (d < thirtyDaysAgo) continue
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    recentByDay[key] = (recentByDay[key] ?? 0) + 1
  }
  const activityTimeline = Object.entries(recentByDay).map(([date, count]) => ({ date, count }))

  return NextResponse.json({ studentAverages, activityTimeline })
}
