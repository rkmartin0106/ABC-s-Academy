'use client'

import { useState } from 'react'
import AddStudentModal, { type StudentRow } from './AddStudentModal'

const LEVEL_COLORS: Record<string, string> = {
  'A1 Beginner': 'bg-gray-100 text-gray-600',
  'A2 Elementary': 'bg-blue-50 text-blue-700',
  'B1 Intermediate': 'bg-indigo-50 text-indigo-700',
  'B2 Upper Intermediate': 'bg-purple-50 text-purple-700',
  'C1 Advanced': 'bg-green-50 text-green-700',
}

function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Props {
  initialStudents: StudentRow[]
}

export default function StudentsSection({ initialStudents }: Props) {
  const [students, setStudents] = useState<StudentRow[]>(initialStudents)
  const [modalOpen, setModalOpen] = useState(false)

  function handleCreated(student: StudentRow) {
    setStudents(prev => [student, ...prev])
  }

  return (
    <>
      <AddStudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />

      <section>
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Students</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        </div>

        {/* Empty state */}
        {students.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No students yet.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 text-blue-700 hover:text-blue-800 text-sm font-medium"
            >
              Add your first student →
            </button>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-blue-700">
                            {getInitials(student.name)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {student.level ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[student.level] ?? 'bg-gray-100 text-gray-600'}`}>
                          {student.level}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                      {formatLastActive(student.last_active_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
