'use client'

import { useState, useEffect, useCallback } from 'react'

interface MessageUser { id: string; name: string; email?: string }
interface Message {
  id: string
  content: string
  read: boolean
  created_at: string
  sender: MessageUser
  receiver: MessageUser
}

interface Thread {
  student: MessageUser
  messages: Message[]
  unreadCount: number
  lastMessage: Message
}

export default function MessagingInbox() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    const res = await fetch('/api/messages')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    const msgs: Message[] = data.messages ?? []

    // Group into threads by student
    const map = new Map<string, { student: MessageUser; messages: Message[] }>()
    for (const m of msgs) {
      // Determine which side is the student
      const student = m.sender.email !== undefined ? m.sender : m.receiver
      if (!map.has(student.id)) map.set(student.id, { student, messages: [] })
      map.get(student.id)!.messages.push(m)
    }

    const built: Thread[] = Array.from(map.values()).map(({ student, messages }) => {
      const sorted = messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const unreadCount = sorted.filter(m => !m.read && m.sender.id === student.id).length
      return { student, messages: sorted, unreadCount, lastMessage: sorted[sorted.length - 1] }
    }).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime())

    setThreads(built)
    // Refresh the selected thread if open
    if (selectedThread) {
      const refreshed = built.find(t => t.student.id === selectedThread.student.id)
      if (refreshed) setSelectedThread(refreshed)
    }
    setLoading(false)
  }, [selectedThread])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  async function openThread(thread: Thread) {
    setSelectedThread(thread)
    setReply('')
    // Mark unread messages as read
    const unreadIds = thread.messages.filter(m => !m.read && m.sender.id === thread.student.id).map(m => m.id)
    if (unreadIds.length > 0) {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      })
      fetchMessages()
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !selectedThread) return
    setSending(true)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply, receiver_id: selectedThread.student.id }),
    })
    setReply('')
    setSending(false)
    fetchMessages()
  }

  const totalUnread = threads.reduce((n, t) => n + t.unreadCount, 0)

  if (loading) return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Messages</h2>
      <div className="card flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </section>
  )

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        {totalUnread > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">{totalUnread}</span>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {threads.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No messages yet</p>
        ) : (
          <div className="flex divide-x divide-gray-100" style={{ minHeight: 320 }}>
            {/* Thread list */}
            <div className="w-64 shrink-0 overflow-y-auto">
              {threads.map(thread => (
                <button
                  key={thread.student.id}
                  onClick={() => openThread(thread)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${selectedThread?.student.id === thread.student.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold truncate ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                      {thread.student.name}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="shrink-0 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{thread.lastMessage.content}</p>
                </button>
              ))}
            </div>

            {/* Thread view */}
            <div className="flex-1 flex flex-col">
              {!selectedThread ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Select a conversation</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">{selectedThread.student.name}</p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 280 }}>
                    {selectedThread.messages.map(m => {
                      const isStudent = m.sender.id === selectedThread.student.id
                      return (
                        <div key={m.id} className={`flex ${isStudent ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${isStudent ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}>
                            <p>{m.content}</p>
                            <p className={`text-[10px] mt-1 ${isStudent ? 'text-gray-400' : 'text-blue-200'}`}>
                              {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Reply */}
                  <form onSubmit={sendReply} className="flex gap-2 p-3 border-t border-gray-100">
                    <input
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Reply…"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
