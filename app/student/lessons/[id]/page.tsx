'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { ContentBlock } from '@/types'

interface LessonData {
  id: string
  title: string
  status: string
  content_blocks: ContentBlock[]
  unit: {
    title: string
    course: {
      title: string
    } | null
  } | null
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) return `https://player.vimeo.com/video/${match[1]}`
  }
  return null
}

export default function StudentLessonPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLesson = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const res = await fetch(`/api/lessons/${id}`)
    if (!res.ok) { setError('Lesson not found.'); setLoading(false); return }
    const data = await res.json()

    // Fetch unit + course info
    const { data: lessonWithUnit } = await supabase
      .from('lessons')
      .select('id, title, status, content_blocks, unit:units(title, course:courses(title))')
      .eq('id', id)
      .single()

    if (!lessonWithUnit) { setError('Lesson not found.'); setLoading(false); return }
    if (lessonWithUnit.status !== 'published') { setError('This lesson is not published yet.'); setLoading(false); return }

    setLesson(lessonWithUnit as unknown as LessonData)
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchLesson() }, [fetchLesson])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !lesson) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error ?? 'Lesson not found.'}</p>
        <button onClick={() => router.push('/student')} className="mt-4 text-blue-600 text-sm hover:underline">← Back to portal</button>
      </div>
    </div>
  )

  const blocks = lesson.content_blocks ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/student')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Back
          </button>
          {lesson.unit?.course?.title && (
            <span className="text-xs text-gray-400 truncate">{lesson.unit.course.title} · {lesson.unit?.title}</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>

        {blocks.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">This lesson has no content yet.</p>
          </div>
        )}

        {/* Content blocks */}
        {blocks.map((block, i) => (
          <div key={i}>
            {block.type === 'text' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{block.content}</p>
              </div>
            )}

            {block.type === 'image' && block.url && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <img
                  src={block.url}
                  alt={block.alt ?? ''}
                  className="w-full object-cover max-h-80"
                />
                {block.alt && (
                  <p className="text-xs text-gray-400 px-4 py-2 text-center">{block.alt}</p>
                )}
              </div>
            )}

            {block.type === 'video' && block.url && (() => {
              const embedUrl = getYouTubeEmbedUrl(block.url)
              return (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {embedUrl ? (
                    <div className="relative" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={block.caption ?? 'Video'}
                      />
                    </div>
                  ) : (
                    <div className="p-4">
                      <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                        Watch video →
                      </a>
                    </div>
                  )}
                  {block.caption && (
                    <p className="text-xs text-gray-400 px-4 py-2 text-center">{block.caption}</p>
                  )}
                </div>
              )
            })()}
          </div>
        ))}

        {/* Footer nav */}
        <button onClick={() => router.push('/student')} className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl text-sm hover:bg-gray-50 transition">
          ← Back to portal
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          ABC&apos;s Academy &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
