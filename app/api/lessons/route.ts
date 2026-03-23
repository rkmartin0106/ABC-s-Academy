import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// POST /api/lessons — create a lesson within a unit
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { unit_id, title } = await req.json()
  if (!unit_id || !title?.trim()) return NextResponse.json({ error: 'unit_id and title required' }, { status: 400 })

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert({ unit_id, title, content_blocks: [], status: 'draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lesson }, { status: 201 })
}
