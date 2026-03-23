import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// ─── Room name helpers ────────────────────────────────────────────────────────

function generateRoomName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const rand = Math.random().toString(36).slice(2, 8)
  return `abcs-${slug}-${rand}`
}

function buildJitsiUrl(roomName: string): string {
  return `https://meet.jit.si/${roomName}`
}

// GET /api/video-sessions — list sessions
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sessions, error } = await supabase
    .from('video_sessions')
    .select('id, title, scheduled_at, room_url, created_at')
    .order('scheduled_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sessions })
}

// POST /api/video-sessions — create a session (teacher only)
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, scheduled_at } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const roomName = generateRoomName(title)
  const room_url = buildJitsiUrl(roomName)

  const { data: session, error } = await supabase
    .from('video_sessions')
    .insert({
      teacher_id: user.id,
      title,
      scheduled_at: scheduled_at || new Date().toISOString(),
      room_url,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ session }, { status: 201 })
}

// DELETE /api/video-sessions — delete a session (teacher only)
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('video_sessions').delete().eq('id', id).eq('teacher_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
