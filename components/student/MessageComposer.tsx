'use client'

import { useState } from 'react'

export default function MessageComposer() {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    setError(null)

    try {
      // Get the teacher's user id
      const teacherRes = await fetch('/api/teacher')
      let receiverId: string | null = null

      if (teacherRes.ok) {
        const data = await teacherRes.json()
        receiverId = data.teacher?.id ?? null
      }

      if (!receiverId) {
        setError('Could not find teacher. Please try again.')
        setSending(false)
        return
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, receiver_id: receiverId }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to send')
        setSending(false)
        return
      }

      setContent('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Message Your Teacher</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <form onSubmit={handleSend} className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write a message to your teacher…"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex items-center justify-between">
            {sent && (
              <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Message sent!
              </span>
            )}
            {!sent && <span />}
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
