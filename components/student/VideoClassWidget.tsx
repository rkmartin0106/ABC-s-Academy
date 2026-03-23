'use client'

import { useState, useEffect } from 'react'

interface VideoSession {
  id: string
  title: string
  scheduled_at: string
  room_url: string
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function VideoClassWidget() {
  const [sessions, setSessions] = useState<VideoSession[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/video-sessions')
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(d => { setSessions((d.sessions ?? []).slice(0, 3)); setLoaded(true) })
  }, [])

  if (!loaded || sessions.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Video Classes</h2>
      </div>
      <div className="space-y-3">
        {sessions.map(session => {
          const isLive = Math.abs(new Date(session.scheduled_at).getTime() - Date.now()) < 3600000 * 2
          return (
            <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm truncate">{session.title}</p>
                  {isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Live now
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatTime(session.scheduled_at)}</p>
              </div>
              <a href={session.room_url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition shrink-0">
                Join
              </a>
            </div>
          )
        })}
      </div>
    </section>
  )
}
