import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// POST /api/units — create a unit within a course
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { course_id, title, order_index } = await req.json()
  if (!course_id || !title?.trim()) return NextResponse.json({ error: 'course_id and title required' }, { status: 400 })

  const { data: unit, error } = await supabase
    .from('units')
    .insert({ course_id, title, order_index: order_index ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ unit }, { status: 201 })
}
