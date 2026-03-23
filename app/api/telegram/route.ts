import { NextRequest, NextResponse } from 'next/server'
import { sendMessage, verifyWebhookSecret, parseCommand } from '@/lib/telegram'
import type { TelegramUpdate } from '@/types'

export async function POST(req: NextRequest) {
  // ── 1. Verify the webhook secret (set via Telegram setWebhook secret_token param) ──
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
  if (!message) {
    // Telegram sends other update types (edited_message, etc.) — ignore safely
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''

  // ── 2. Parse the incoming command ────────────────────────────────────────────
  const { command, args } = parseCommand(text)

  switch (command) {
    // TODO: "assign hw" → createAssignment(message, args)
    case 'assign':
    case '/assign':
      await sendMessage(chatId, '📝 <b>Assignment creation coming soon!</b>')
      break

    // TODO: "show students" → listStudents(message)
    case 'show':
    case '/students':
      await sendMessage(chatId, '👩‍🎓 <b>Student listing coming soon!</b>')
      break

    // TODO: "student progress [name]" → getStudentProgress(message, args[0])
    case 'progress':
    case '/progress':
      await sendMessage(
        chatId,
        `📊 <b>Progress report for ${args[0] ?? 'student'} coming soon!</b>`
      )
      break

    default:
      await sendMessage(chatId, 'EduPlatform bot is connected ✅')
      break
  }

  return NextResponse.json({ ok: true })
}

// Telegram only calls POST — reject other methods cleanly
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
