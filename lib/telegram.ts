import type { TelegramMessage } from '@/types'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_PLATFORM_BOT_TOKEN}`

// ─── Send a message to a Telegram chat ───────────────────────────────────────

export async function sendMessage(
  chatId: number,
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('[Telegram] sendMessage failed:', error)
  }
}

// ─── Extract command from message text ───────────────────────────────────────

export function parseCommand(text: string): { command: string; args: string[] } {
  const parts = text.trim().split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)
  return { command, args }
}

// ─── Verify webhook secret token ─────────────────────────────────────────────

export function verifyWebhookSecret(token: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if not configured
  return token === secret
}

// ─── Future command handlers (placeholders) ───────────────────────────────────

// TODO: createAssignment(message: TelegramMessage, args: string[]) → creates an assignment
// TODO: listStudents(message: TelegramMessage) → returns list of enrolled students
// TODO: getStudentProgress(message: TelegramMessage, studentName: string) → returns progress report

export type CommandHandler = (message: TelegramMessage, args: string[]) => Promise<string>

export const commandHandlers: Record<string, CommandHandler> = {
  // Handlers will be registered here as features are built
}
