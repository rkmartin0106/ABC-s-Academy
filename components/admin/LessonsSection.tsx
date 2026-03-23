'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import type { ContentBlock } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonRow {
  id: string
  title: string
  status: 'draft' | 'published'
  content_blocks: ContentBlock[]
  created_at: string
}

interface UnitRow {
  id: string
  title: string
  order_index: number
  lessons: LessonRow[]
}

interface CourseRow {
  id: string
  title: string
  description: string | null
  created_at: string
  units: UnitRow[]
}

// ─── Inline small modals ──────────────────────────────────────────────────────

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Lesson Editor Modal ──────────────────────────────────────────────────────

function LessonEditorModal({
  lesson,
  onClose,
  onSaved,
}: {
  lesson: LessonRow
  onClose: () => void
  onSaved: (updated: LessonRow) => void
}) {
  const [title, setTitle] = useState(lesson.title)
  const [blocks, setBlocks] = useState<ContentBlock[]>(lesson.content_blocks ?? [])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addBlock(type: ContentBlock['type']) {
    if (type === 'text') setBlocks(b => [...b, { type: 'text', content: '' }])
    else if (type === 'image') setBlocks(b => [...b, { type: 'image', url: '', alt: '' }])
    else if (type === 'video') setBlocks(b => [...b, { type: 'video', url: '', caption: '' }])
  }

  function removeBlock(i: number) {
    setBlocks(b => b.filter((_, idx) => idx !== i))
  }

  function updateBlock(i: number, patch: Partial<ContentBlock>) {
    setBlocks(b => b.map((block, idx) => idx === i ? { ...block, ...patch } as ContentBlock : block))
  }

  function moveBlock(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content_blocks: blocks }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    onSaved(json.lesson)
    setSaving(false)
  }

  async function togglePublish() {
    setPublishing(true)
    setError(null)
    const newStatus = lesson.status === 'published' ? 'draft' : 'published'
    // save content first then update status
    const res = await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content_blocks: blocks, status: newStatus }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setPublishing(false); return }
    onSaved(json.lesson)
    setPublishing(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition w-full mr-4"
            placeholder="Lesson title"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content blocks */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {blocks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No content yet. Add a block below.</p>
          )}

          {blocks.map((block, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2 group relative">
              {/* Block controls */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{block.type}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button type="button" onClick={() => removeBlock(i)} className="p-1 text-gray-300 hover:text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {block.type === 'text' && (
                <textarea
                  value={block.content}
                  onChange={e => updateBlock(i, { content: e.target.value })}
                  rows={4}
                  placeholder="Write your lesson content here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}

              {block.type === 'image' && (
                <div className="space-y-2">
                  <input
                    value={block.url}
                    onChange={e => updateBlock(i, { url: e.target.value })}
                    placeholder="Image URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={block.alt ?? ''}
                    onChange={e => updateBlock(i, { alt: e.target.value })}
                    placeholder="Alt text (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {block.url && (
                    <img src={block.url} alt={block.alt} className="rounded-lg max-h-40 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>
              )}

              {block.type === 'video' && (
                <div className="space-y-2">
                  <input
                    value={block.url}
                    onChange={e => updateBlock(i, { url: e.target.value })}
                    placeholder="YouTube or Vimeo URL..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={block.caption ?? ''}
                    onChange={e => updateBlock(i, { caption: e.target.value })}
                    placeholder="Caption (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add block buttons */}
          <div className="flex gap-2 pt-2">
            {(['text', 'image', 'video'] as const).map(t => (
              <button key={t} type="button" onClick={() => addBlock(t)}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-500 text-xs font-medium rounded-lg transition capitalize">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mx-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={togglePublish} disabled={publishing}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 ${
              lesson.status === 'published' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'
            }`}>
            {publishing ? '…' : lesson.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main LessonsSection ──────────────────────────────────────────────────────

export default function LessonsSection() {
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())

  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState<string | null>(null) // courseId
  const [showLessonModal, setShowLessonModal] = useState<string | null>(null) // unitId
  const [editLesson, setEditLesson] = useState<LessonRow | null>(null)

  // Form states
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [newUnitTitle, setNewUnitTitle] = useState('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/courses')
    if (res.ok) {
      const data = await res.json()
      setCourses(data.courses ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  function toggleCourse(id: string) {
    setExpandedCourses(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleUnit(id: string) {
    setExpandedUnits(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function createCourse(e: FormEvent) {
    e.preventDefault()
    setFormLoading(true); setFormError(null)
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newCourseTitle, description: newCourseDesc }),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error); setFormLoading(false); return }
    setFormLoading(false); setShowCourseModal(false)
    setNewCourseTitle(''); setNewCourseDesc('')
    fetchCourses()
  }

  async function createUnit(e: FormEvent, courseId: string) {
    e.preventDefault()
    setFormLoading(true); setFormError(null)
    const course = courses.find(c => c.id === courseId)
    const orderIndex = course?.units?.length ?? 0
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, title: newUnitTitle, order_index: orderIndex }),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error); setFormLoading(false); return }
    setFormLoading(false); setShowUnitModal(null); setNewUnitTitle('')
    fetchCourses()
    setExpandedCourses(prev => { const n = new Set(prev); n.add(courseId); return n })
  }

  async function createLesson(e: FormEvent, unitId: string) {
    e.preventDefault()
    setFormLoading(true); setFormError(null)
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_id: unitId, title: newLessonTitle }),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error); setFormLoading(false); return }
    setFormLoading(false); setShowLessonModal(null); setNewLessonTitle('')
    fetchCourses()
    setExpandedUnits(prev => { const n = new Set(prev); n.add(unitId); return n })
  }

  function onLessonSaved(updated: LessonRow) {
    setCourses(prev => prev.map(c => ({
      ...c,
      units: c.units.map(u => ({
        ...u,
        lessons: u.lessons.map(l => l.id === updated.id ? updated : l),
      })),
    })))
    setEditLesson(updated)
  }

  const totalLessons = courses.reduce((sum, c) => sum + c.units.reduce((s, u) => s + u.lessons.length, 0), 0)
  const publishedCount = courses.reduce((sum, c) => sum + c.units.reduce((s, u) => s + u.lessons.filter(l => l.status === 'published').length, 0), 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lessons</h2>
          {totalLessons > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{publishedCount} published · {totalLessons - publishedCount} draft</p>
          )}
        </div>
        <button onClick={() => setShowCourseModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Course
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">No courses yet</p>
          <p className="text-gray-400 text-xs mt-1">Create a course to start building lessons.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className="card overflow-hidden p-0">
              {/* Course header */}
              <button onClick={() => toggleCourse(course.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition">
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCourses.has(course.id) ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{course.title}</p>
                  {course.description && <p className="text-xs text-gray-400 truncate">{course.description}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{course.units.length} unit{course.units.length !== 1 ? 's' : ''}</span>
              </button>

              {expandedCourses.has(course.id) && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {course.units.length === 0 && (
                    <p className="px-12 py-3 text-xs text-gray-400">No units yet.</p>
                  )}

                  {course.units.map(unit => (
                    <div key={unit.id}>
                      <button onClick={() => toggleUnit(unit.id)}
                        className="w-full flex items-center gap-3 pl-12 pr-5 py-3 text-left hover:bg-gray-50 transition">
                        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedUnits.has(unit.id) ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="flex-1 text-sm font-medium text-gray-700">{unit.title}</span>
                        <span className="text-xs text-gray-400">{unit.lessons.length} lesson{unit.lessons.length !== 1 ? 's' : ''}</span>
                      </button>

                      {expandedUnits.has(unit.id) && (
                        <div className="divide-y divide-gray-50">
                          {unit.lessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center gap-3 pl-20 pr-5 py-2.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lesson.status === 'published' ? '#16a34a' : '#d1d5db' }} />
                              <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                              <span className={`text-xs font-medium ${lesson.status === 'published' ? 'text-green-600' : 'text-gray-400'}`}>
                                {lesson.status}
                              </span>
                              <button onClick={() => setEditLesson(lesson)}
                                className="text-xs text-blue-600 hover:underline">
                                Edit
                              </button>
                            </div>
                          ))}

                          <div className="pl-20 pr-5 py-2.5">
                            <button onClick={() => { setShowLessonModal(unit.id); setNewLessonTitle(''); setFormError(null) }}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              Add Lesson
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pl-12 pr-5 py-3">
                    <button onClick={() => { setShowUnitModal(course.id); setNewUnitTitle(''); setFormError(null) }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Add Unit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCourseModal && (
        <SimpleModal title="New Course" onClose={() => setShowCourseModal(false)}>
          <form onSubmit={createCourse} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
              <input required value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} placeholder="e.g. English for Beginners"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} placeholder="Short description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCourseModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60">
                {formLoading ? 'Creating…' : 'Create Course'}
              </button>
            </div>
          </form>
        </SimpleModal>
      )}

      {/* Create Unit Modal */}
      {showUnitModal && (
        <SimpleModal title="Add Unit" onClose={() => setShowUnitModal(null)}>
          <form onSubmit={e => createUnit(e, showUnitModal)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Title</label>
              <input required value={newUnitTitle} onChange={e => setNewUnitTitle(e.target.value)} placeholder="e.g. Unit 1: Greetings"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowUnitModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60">
                {formLoading ? 'Adding…' : 'Add Unit'}
              </button>
            </div>
          </form>
        </SimpleModal>
      )}

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <SimpleModal title="Add Lesson" onClose={() => setShowLessonModal(null)}>
          <form onSubmit={e => createLesson(e, showLessonModal)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
              <input required value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} placeholder="e.g. Lesson 1: Hello!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowLessonModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold disabled:opacity-60">
                {formLoading ? 'Adding…' : 'Add Lesson'}
              </button>
            </div>
          </form>
        </SimpleModal>
      )}

      {/* Lesson Editor Modal */}
      {editLesson && (
        <LessonEditorModal
          lesson={editLesson}
          onClose={() => setEditLesson(null)}
          onSaved={onLessonSaved}
        />
      )}
    </section>
  )
}
