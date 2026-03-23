import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { ContentBlock } from '@/types'

// GET /api/lessons/[id] — fetch a single lesson
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, title, content_blocks, status, created_at, unit_id')
    .eq('id', params.id)
    .single()

  if (error || !lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ lesson })
}

// PATCH /api/lessons/[id] — update lesson (content_blocks, title, status)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    title?: string
    content_blocks?: ContentBlock[]
    status?: 'draft' | 'published'
  }

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title
  if (body.content_blocks !== undefined) patch.content_blocks = body.content_blocks
  if (body.status !== undefined) patch.status = body.status

  const { data: lesson, error } = await supabase
    .from('lessons')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lesson })
}
