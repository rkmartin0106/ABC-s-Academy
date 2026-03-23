import { NextRequest, NextResponse } from 'next/server'
import { sendMessage, verifyWebhookSecret } from '@/lib/telegram'
import { createSupabaseAdminClient } from '@/lib/supabase'
import type { TelegramUpdate } from '@/types'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

  switch (command) {
    case '/students':
      await handleStudents(chatId)
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

  return NextResponse.json({ ok: true })
}

// ─── /students ────────────────────────────────────────────────────────────────

async function handleStudents(chatId: number) {
  const admin = createSupabaseAdminClient()

  const { data: students, error } = await admin
    .from('users')
    .select('name, level')
    .eq('role', 'student')
    .order('name')

  if (error) {
    await sendMessage(chatId, `❌ Failed to fetch students: ${error.message}`)
    return
  }

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

// ─── /deploy ──────────────────────────────────────────────────────────────────

async function handleDeploy(chatId: number) {
  await sendMessage(chatId, '🚀 Deploying to Vercel...')

  try {
    const { stdout, stderr } = await execAsync('npx vercel --prod --yes', {
      timeout: 120_000,
    })

    const output = (stdout + stderr).trim()
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/i)
    const url = urlMatch ? urlMatch[0] : null

    await sendMessage(
      chatId,
      url
        ? `✅ Deployed successfully!\n\n${url}`
        : `✅ Deploy completed.\n\n<code>${output.slice(-300)}</code>`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sendMessage(chatId, `❌ Deploy failed:\n\n<code>${message.slice(0, 500)}</code>`)
  }
}

// ─── /help ────────────────────────────────────────────────────────────────────

async function handleHelp(chatId: number) {
  await sendMessage(
    chatId,
    `🤖 <b>ABC's Academy Bot</b>

Available commands:

/students — List all enrolled students with their level
/deploy — Deploy the latest code to Vercel (production)
/help — Show this message`
  )
}

// Telegram only calls POST
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
