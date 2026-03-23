'use client'

import { useState, useEffect, useCallback } from 'react'
import CreateHomeworkModal from './CreateHomeworkModal'

interface Assignment {
  id: string
  title: string
  due_date: string | null
  created_at: string
  questions: unknown[]
  student_assignments: { count: number }[]
}

export default function HomeworkSection() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/assignments')
    if (res.ok) {
      const data = await res.json()
      setAssignments(data.assignments ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  function formatDue(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Homework</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Homework
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">No homework yet</p>
          <p className="text-gray-400 text-xs mt-1">Create your first assignment to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const questionCount = Array.isArray(a.questions) ? a.questions.length : 0
            const assignedCount = a.student_assignments?.[0]?.count ?? 0
            const due = formatDue(a.due_date)
            return (
              <div key={a.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{a.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-gray-400">{assignedCount} student{assignedCount !== 1 ? 's' : ''} assigned</span>
                    {due && <span className="text-xs text-gray-400">Due {due}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateHomeworkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchAssignments}
      />
    </section>
  )
}
