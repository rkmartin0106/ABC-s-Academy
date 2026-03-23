import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sendMessage as sendTelegram } from '@/lib/telegram'

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_TEACHER_CHAT_ID
  ? parseInt(process.env.TELEGRAM_TEACHER_CHAT_ID)
  : null

// GET /api/messages — fetch inbox for current user
// teachers get all messages; students get their own thread
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  if (isTeacher) {
    // Teacher sees all messages from students, grouped by student
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, content, read, created_at,
        sender:users!messages_sender_id_fkey(id, name, email),
        receiver:users!messages_receiver_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ messages, role: 'teacher' })
  } else {
    // Student sees their own messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id, content, read, created_at,
        sender:users!messages_sender_id_fkey(id, name),
        receiver:users!messages_receiver_id_fkey(id, name)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ messages, role: 'student' })
  }
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, receiver_id } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })
  if (!receiver_id) return NextResponse.json({ error: 'receiver_id required' }, { status: 400 })

  const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ sender_id: user.id, receiver_id, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Telegram notification if student sends a message to teacher
  if (profile?.role === 'student' && TELEGRAM_CHAT_ID) {
    sendTelegram(
      TELEGRAM_CHAT_ID,
      `💬 <b>New message from ${profile.name}</b>\n\n${content}\n\n<i>Reply at ${process.env.NEXT_PUBLIC_SITE_URL}/admin</i>`
    ).catch(() => {/* non-blocking */})
  }

  return NextResponse.json({ message }, { status: 201 })
}

// PATCH /api/messages — mark messages as read
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!ids?.length) return NextResponse.json({ ok: true })

  await supabase
    .from('messages')
    .update({ read: true })
    .in('id', ids)
    .eq('receiver_id', user.id)

  return NextResponse.json({ ok: true })
}
