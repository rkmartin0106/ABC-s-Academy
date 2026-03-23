import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import type { StudentLevel } from '@/types'

// POST /api/students — create a new student account
export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated teacher
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse request body
  const { name, email, password, level } = await req.json() as {
    name: string
    email: string
    password: string
    level: StudentLevel
  }

  if (!name || !email || !password || !level) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Create the auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip confirmation email
    user_metadata: { name, role: 'student' },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create auth user' },
      { status: 400 }
    )
  }

  // 2. Insert into public.users (the auth trigger may also fire — upsert to be safe)
  const { data: newUser, error: dbError } = await admin
    .from('users')
    .upsert({
      id: authData.user.id,
      email,
      name,
      role: 'student',
      level,
    })
    .select()
    .single()

  if (dbError) {
    // Roll back the auth user if the DB insert fails
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ user: newUser }, { status: 201 })
}

// GET /api/students — list all students
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: students, error } = await supabase
    .from('users')
    .select('id, name, email, level, last_active_at, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ students })
}
