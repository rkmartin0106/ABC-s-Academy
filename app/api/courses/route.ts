import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/courses — list all courses with units and lessons
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, created_at,
      units(id, title, order_index,
        lessons(id, title, status, created_at, content_blocks)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ courses })
}

// POST /api/courses — create a course
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data: course, error } = await supabase
    .from('courses')
    .insert({ title, description: description || null, teacher_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ course }, { status: 201 })
}
