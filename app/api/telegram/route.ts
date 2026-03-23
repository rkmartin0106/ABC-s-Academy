import { NextRequest, NextResponse } from 'next/server'
import { sendMessage, verifyWebhookSecret } from '@/lib/telegram'
import { createSupabaseAdminClient } from '@/lib/supabase'
import type { TelegramUpdate } from '@/types'

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token')
  if (!verifyWebhookSecret(secretToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await req.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = update.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''
  const command = text.split(/\s+/)[0].toLowerCase()

  try {
    switch (command) {
      case '/students':
        await handleStudents(chatId)
        break

      case '/addstudent':
        await handleAddStudent(chatId, text)
        break

      case '/deletestudent':
        await handleDeleteStudent(chatId, text)
        break

      case '/progress':
        await handleProgress(chatId, text)
        break

      case '/assign':
        await handleAssign(chatId, text)
        break

      case '/broadcast':
        await handleBroadcast(chatId, text)
        break

      case '/deploy':
        await handleDeploy(chatId)
        break

      case '/help':
        await handleHelp(chatId)
        break

      default:
        await sendMessage(chatId, 'Unknown command. Send /help to see available commands.')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Telegram webhook] Unhandled error:', msg)
    await sendMessage(chatId, `❌ Internal error: ${msg}`)
  }

  return NextResponse.json({ ok: true })
}

// ─── /students ────────────────────────────────────────────────────────────────

async function handleStudents(chatId: number) {
  // Validate required env vars before touching Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean)
      .join(', ')
    console.error('[/students] Missing env vars:', missing)
    await sendMessage(chatId, `❌ Server misconfiguration — missing env vars: ${missing}`)
    return
  }

  console.log('[/students] Querying users table with service role key...')

  const admin = createSupabaseAdminClient()

  const { data: students, error } = await admin
    .from('users')
    .select('name, level')
    .eq('role', 'student')
    .order('name')

  if (error) {
    console.error('[/students] Supabase error:', error)
    await sendMessage(chatId, `❌ Supabase error: ${error.message}\nCode: ${error.code}`)
    return
  }

  console.log(`[/students] Query succeeded — ${students?.length ?? 0} students found`)

  if (!students || students.length === 0) {
    await sendMessage(chatId, '👩‍🎓 No students enrolled yet.')
    return
  }

  const lines = students.map((s, i) => {
    const level = s.level ?? 'No level set'
    return `${i + 1}. <b>${s.name}</b> — ${level}`
  })

  await sendMessage(
    chatId,
    `👩‍🎓 <b>Students (${students.length})</b>\n\n${lines.join('\n')}`
  )
}

// ─── /addstudent ─────────────────────────────────────────────────────────────
// Usage: /addstudent <name> <email> <level>
// Level accepts short codes (A1, A2, B1, B2, C1) or full names

const LEVEL_MAP: Record<string, string> = {
  a1: 'A1 Beginner',
  a2: 'A2 Elementary',
  b1: 'B1 Intermediate',
  b2: 'B2 Upper Intermediate',
  c1: 'C1 Advanced',
}

function resolveLevel(input: string): string | null {
  const key = input.toLowerCase()
  if (LEVEL_MAP[key]) return LEVEL_MAP[key]
  // Accept full level names too
  const full = Object.values(LEVEL_MAP).find(v => v.toLowerCase() === key)
  return full ?? null
}

async function handleAddStudent(chatId: number, text: string) {
  // Parse: /addstudent <name> <email> <level>
  // Email is identified by @; name is everything before it, level after
  const parts = text.trim().split(/\s+/)
  parts.shift() // remove /addstudent

  const emailIndex = parts.findIndex(p => p.includes('@'))
  if (emailIndex === -1) {
    await sendMessage(chatId,
      '❌ Could not find an email address.\n\nUsage: /addstudent &lt;name&gt; &lt;email&gt; &lt;level&gt;\nExample: /addstudent Roman roman@example.com B1'
    )
    return
  }

  const name = parts.slice(0, emailIndex).join(' ').trim()
  const email = parts[emailIndex]
  const levelInput = parts.slice(emailIndex + 1).join(' ').trim()

  if (!name || !email || !levelInput) {
    await sendMessage(chatId,
      '❌ Missing fields.\n\nUsage: /addstudent &lt;name&gt; &lt;email&gt; &lt;level&gt;\nExample: /addstudent Roman roman@example.com B1'
    )
    return
  }

  const level = resolveLevel(levelInput)
  if (!level) {
    await sendMessage(chatId,
      `❌ Unknown level "${levelInput}".\n\nValid levels: A1, A2, B1, B2, C1`
    )
    return
  }

  const admin = createSupabaseAdminClient()

  // Auto-generate a password
  const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'student' },
  })

  if (authError || !authData.user) {
    await sendMessage(chatId, `❌ Failed to create auth user: ${authError?.message}`)
    return
  }

  const { error: dbError } = await admin
    .from('users')
    .upsert({ id: authData.user.id, email, name, role: 'student', level })

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    await sendMessage(chatId, `❌ DB error: ${dbError.message}`)
    return
  }

  await sendMessage(
    chatId,
    `✅ Student created!\n\n👤 <b>${name}</b>\n📧 ${email}\n📚 ${level}\n🔑 Password: <code>${password}</code>\n\nShare these credentials with the student.`
  )
}

// ─── /deletestudent ──────────────────────────────────────────────────────────
// Usage: /deletestudent <email>

async function handleDeleteStudent(chatId: number, text: string) {
  const parts = text.trim().split(/\s+/)
  const email = parts[1]?.toLowerCase()

  if (!email || !email.includes('@')) {
    await sendMessage(chatId,
      '❌ Please provide the student\'s email.\n\nUsage: /deletestudent &lt;email&gt;\nExample: /deletestudent roman@example.com'
    )
    return
  }

  const admin = createSupabaseAdminClient()

  // Look up the student by email
  const { data: student, error: lookupError } = await admin
    .from('users')
    .select('id, name, role')
    .eq('email', email)
    .single()

  if (lookupError || !student) {
    await sendMessage(chatId, `❌ No student found with email: ${email}`)
    return
  }

  if (student.role !== 'student') {
    await sendMessage(chatId, `❌ That account is not a student (role: ${student.role}). Aborting.`)
    return
  }

  // Delete from public.users first, then auth
  const { error: dbError } = await admin
    .from('users')
    .delete()
    .eq('id', student.id)

  if (dbError) {
    await sendMessage(chatId, `❌ DB error: ${dbError.message}`)
    return
  }

  const { error: authError } = await admin.auth.admin.deleteUser(student.id)

  if (authError) {
    await sendMessage(chatId, `⚠️ Removed from DB but failed to delete auth user: ${authError.message}`)
    return
  }

  await sendMessage(chatId, `✅ Student deleted.\n\n👤 <b>${student.name}</b>\n📧 ${email}`)
}

// ─── /progress ────────────────────────────────────────────────────────────────
// Usage: /progress <student name>

async function handleProgress(chatId: number, text: string) {
  const parts = text.trim().split(/\s+/)
  parts.shift()
  const name = parts.join(' ').trim()

  if (!name) {
    await sendMessage(chatId, '❌ Usage: /progress &lt;student name&gt;\nExample: /progress Roman Martin')
    return
  }

  const admin = createSupabaseAdminClient()

  // Find student by name (case-insensitive partial match)
  const { data: students } = await admin
    .from('users')
    .select('id, name, level, xp, streak_days')
    .eq('role', 'student')
    .ilike('name', `%${name}%`)
    .limit(1)

  if (!students || students.length === 0) {
    await sendMessage(chatId, `❌ No student found matching "${name}"`)
    return
  }

  const student = students[0]

  // Fetch recent submissions
  const { data: submissions } = await admin
    .from('student_assignments')
    .select('score, submitted_at, assignment:assignments(title)')
    .eq('student_id', student.id)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(5)

  const { count: totalAssigned } = await admin
    .from('student_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', student.id)

  const submitted = submissions?.length ?? 0
  const avgScore = submitted > 0
    ? Math.round((submissions ?? []).reduce((s: number, r: any) => s + (r.score ?? 0), 0) / submitted)
    : null

  const completionPct = totalAssigned ? Math.round((submitted / totalAssigned) * 100) : 0

  const lines = [
    `📊 <b>${student.name}</b> — Progress Report`,
    `📚 Level: ${student.level ?? 'Not set'}`,
    `✨ XP: ${student.xp ?? 0}`,
    `🔥 Streak: ${student.streak_days ?? 0} days`,
    `✅ Submitted: ${submitted} / ${totalAssigned ?? 0} (${completionPct}%)`,
    avgScore !== null ? `📈 Avg Score: ${avgScore}%` : '',
    '',
    submitted > 0 ? '<b>Recent submissions:</b>' : 'No submissions yet.',
    ...(submissions ?? []).map((s: any) => {
      const date = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'
      return `• ${s.assignment?.title ?? 'Untitled'} — <b>${Math.round(s.score ?? 0)}%</b> (${date})`
    }),
  ].filter(Boolean).join('\n')

  await sendMessage(chatId, lines)
}

// ─── /assign ──────────────────────────────────────────────────────────────────
// Usage: /assign <student name> | <homework title>
// Uses | as delimiter to handle multi-word names and titles

async function handleAssign(chatId: number, text: string) {
  const withoutCmd = text.replace(/^\/assign\s*/i, '')
  const sep = withoutCmd.indexOf('|')

  if (sep === -1) {
    await sendMessage(chatId, '❌ Usage: /assign &lt;student name&gt; | &lt;homework title&gt;\nExample: /assign Roman Martin | Unit 3 Quiz')
    return
  }

  const studentName = withoutCmd.slice(0, sep).trim()
  const hwTitle = withoutCmd.slice(sep + 1).trim()

  if (!studentName || !hwTitle) {
    await sendMessage(chatId, '❌ Both student name and homework title are required.\nExample: /assign Roman Martin | Unit 3 Quiz')
    return
  }

  const admin = createSupabaseAdminClient()

  // Find student
  const { data: students } = await admin
    .from('users')
    .select('id, name')
    .eq('role', 'student')
    .ilike('name', `%${studentName}%`)
    .limit(1)

  if (!students || students.length === 0) {
    await sendMessage(chatId, `❌ No student found matching "${studentName}"`)
    return
  }

  // Find assignment
  const { data: assignments } = await admin
    .from('assignments')
    .select('id, title')
    .ilike('title', `%${hwTitle}%`)
    .limit(1)

  if (!assignments || assignments.length === 0) {
    await sendMessage(chatId, `❌ No homework found matching "${hwTitle}"`)
    return
  }

  const student = students[0]
  const assignment = assignments[0]

  // Check if already assigned
  const { data: existing } = await admin
    .from('student_assignments')
    .select('id')
    .eq('student_id', student.id)
    .eq('assignment_id', assignment.id)
    .single()

  if (existing) {
    await sendMessage(chatId, `⚠️ <b>${student.name}</b> is already assigned "<b>${assignment.title}</b>".`)
    return
  }

  // Assign
  const { error } = await admin
    .from('student_assignments')
    .insert({ student_id: student.id, assignment_id: assignment.id, status: 'not_started' })

  if (error) {
    await sendMessage(chatId, `❌ DB error: ${error.message}`)
    return
  }

  await sendMessage(chatId, `✅ Assigned!\n\n👤 <b>${student.name}</b> → 📝 <b>${assignment.title}</b>`)
}

// ─── /broadcast ───────────────────────────────────────────────────────────────
// Usage: /broadcast <message>
// Stores a broadcast message in the messages table for all students to see

async function handleBroadcast(chatId: number, text: string) {
  const message = text.replace(/^\/broadcast\s*/i, '').trim()

  if (!message) {
    await sendMessage(chatId, '❌ Usage: /broadcast &lt;message&gt;\nExample: /broadcast Class is cancelled today!')
    return
  }

  const admin = createSupabaseAdminClient()

  // Get the teacher user
  const { data: teachers } = await admin
    .from('users')
    .select('id')
    .eq('role', 'teacher')
    .limit(1)

  if (!teachers || teachers.length === 0) {
    await sendMessage(chatId, '❌ No teacher account found in the system.')
    return
  }

  const teacherId = teachers[0].id

  // Get all students
  const { data: students } = await admin
    .from('users')
    .select('id')
    .eq('role', 'student')

  if (!students || students.length === 0) {
    await sendMessage(chatId, '⚠️ No students enrolled yet — nothing to broadcast to.')
    return
  }

  // Insert a message from teacher to each student
  const rows = students.map((s: any) => ({
    sender_id: teacherId,
    receiver_id: s.id,
    content: `📢 Announcement: ${message}`,
  }))

  const { error } = await admin.from('messages').insert(rows)

  if (error) {
    await sendMessage(chatId, `❌ Error broadcasting: ${error.message}`)
    return
  }

  await sendMessage(chatId, `✅ Broadcast sent to <b>${students.length}</b> student${students.length !== 1 ? 's' : ''}!\n\n"${message}"`)
}

// ─── /deploy ──────────────────────────────────────────────────────────────────

async function handleDeploy(chatId: number) {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL

  if (!hookUrl) {
    await sendMessage(
      chatId,
      '❌ <b>VERCEL_DEPLOY_HOOK_URL</b> is not set.\n\nTo fix:\n1. Go to Vercel → your project → Settings → Git → Deploy Hooks\n2. Create a hook named "Telegram" on branch <code>main</code>\n3. Copy the URL and add it as <code>VERCEL_DEPLOY_HOOK_URL</code> in your Vercel env vars'
    )
    return
  }

  await sendMessage(chatId, '🚀 Triggering production deploy...')

  const res = await fetch(hookUrl, { method: 'POST' })

  if (!res.ok) {
    await sendMessage(chatId, `❌ Deploy hook failed — HTTP ${res.status}`)
    return
  }

  await sendMessage(
    chatId,
    `✅ Deploy triggered! Vercel is building now.\n\nTrack progress: https://vercel.com/dashboard`
  )
}

// ─── /help ────────────────────────────────────────────────────────────────────

async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `🤖 <b>ABC's Academy Bot</b>

<b>Student management:</b>
/students — List all enrolled students
/addstudent &lt;name&gt; &lt;email&gt; &lt;level&gt; — Create student
/deletestudent &lt;email&gt; — Delete student

<b>Homework:</b>
/progress &lt;name&gt; — Recent scores &amp; stats
/assign &lt;name&gt; | &lt;homework title&gt; — Assign homework

<b>Communication:</b>
/broadcast &lt;message&gt; — Send to all students

<b>System:</b>
/deploy — Deploy to Vercel
/help — Show this message

Level codes: A1 · A2 · B1 · B2 · C1`
  )
}

// Telegram only calls POST
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
