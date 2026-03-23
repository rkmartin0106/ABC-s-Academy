import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { gradeHomework, type StudentAnswers } from '@/lib/grading'
import { processSubmission } from '@/lib/gamification'
import type { Question } from '@/types'

// POST /api/homework/[id] — submit answers and auto-grade
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json() as { answers: StudentAnswers }

  // Load the assignment
  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .select('id, questions')
    .eq('id', params.id)
    .single()

  if (aErr || !assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  // Load the student_assignment row
  const { data: sa, error: saErr } = await supabase
    .from('student_assignments')
    .select('id, status')
    .eq('student_id', user.id)
    .eq('assignment_id', params.id)
    .single()

  if (saErr || !sa) return NextResponse.json({ error: 'Assignment not assigned to you' }, { status: 404 })
  if (sa.status === 'submitted') return NextResponse.json({ error: 'Already submitted' }, { status: 400 })

  const questions = assignment.questions as Question[]
  const result = gradeHomework(questions, answers)

  const { error: updateErr } = await supabase
    .from('student_assignments')
    .update({
      status: 'submitted',
      answers,
      score: result.score,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', sa.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Award XP + badges (non-blocking)
  const gamification = await processSubmission(user.id, result.score).catch(() => null)

  return NextResponse.json({
    score: result.score,
    correct: result.correct,
    total: result.total,
    breakdown: result.breakdown,
    xp: gamification ?? undefined,
  })
}
