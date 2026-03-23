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

Available commands:

/students — List all enrolled students with their level
/addstudent &lt;name&gt; &lt;email&gt; &lt;level&gt; — Create a new student account
/deploy — Deploy the latest code to Vercel (production)
/help — Show this message

Level codes: A1 · A2 · B1 · B2 · C1`
  )
}

// Telegram only calls POST
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
