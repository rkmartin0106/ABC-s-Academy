import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Question } from '@/types'

// GET /api/assignments — list all assignments (teacher only)
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id, title, due_date, created_at, questions, student_assignments(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ assignments })
}

// POST /api/assignments — create an assignment
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, questions, due_date, studentIds } = await req.json() as {
    title: string
    questions: Question[]
    due_date: string | null
    studentIds: string[]
  }

  if (!title || !questions?.length) return NextResponse.json({ error: 'Title and questions required' }, { status: 400 })

  // Create the assignment
  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .insert({ title, questions, due_date: due_date || null })
    .select()
    .single()

  if (aErr || !assignment) return NextResponse.json({ error: aErr?.message }, { status: 500 })

  // Assign to selected students
  if (studentIds?.length) {
    const rows = studentIds.map(sid => ({
      student_id: sid,
      assignment_id: assignment.id,
      status: 'not_started',
    }))
    const { error: saErr } = await supabase.from('student_assignments').insert(rows)
    if (saErr) return NextResponse.json({ error: saErr.message }, { status: 500 })
  }

  return NextResponse.json({ assignment }, { status: 201 })
}
