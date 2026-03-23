import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/teacher — returns the first teacher's id and name (for student use)
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: teacher } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'teacher')
    .limit(1)
    .single()

  if (!teacher) return NextResponse.json({ error: 'No teacher found' }, { status: 404 })

  return NextResponse.json({ teacher })
}
