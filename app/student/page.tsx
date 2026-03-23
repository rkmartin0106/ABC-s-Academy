import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import StudentNav from '@/components/student/StudentNav'
import type { Assignment, Lesson } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const first = name.split(' ')[0]
  if (hour < 12) return `Good morning, ${first} ☀️`
  if (hour < 17) return `Good afternoon, ${first} 👋`
  return `Good evening, ${first} 🌙`
}

function formatDue(dateStr: string | null): { label: string; urgent: boolean } {
  if (!dateStr) return { label: 'No due date', urgent: false }
  const due = new Date(dateStr)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Overdue', urgent: true }
  if (diffDays === 0) return { label: 'Due today', urgent: true }
  if (diffDays === 1) return { label: 'Due tomorrow', urgent: true }
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, urgent: false }
  return { label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, urgent: false }
}

const STATUS_CONFIG = {
  not_started: { label: 'Not started', className: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'In progress', className: 'bg-yellow-50 text-yellow-700' },
  submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700' },
} as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentPortal() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/admin')

  const supabase = createSupabaseServerClient()

  // Fetch assigned homework
  const { data: studentAssignments } = await supabase
    .from('student_assignments')
    .select(`
      id, status, score, submitted_at,
      assignment:assignments(id, title, due_date, questions)
    `)
    .eq('student_id', user.id)
    .neq('status', 'submitted')
    .order('created_at', { ascending: false })

  // Fetch published lessons (via units → courses)
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, status, created_at, unit:units(id, title, course:courses(id, title))')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(6)

  const homework = (studentAssignments ?? []) as unknown as Array<{
    id: string
    status: 'not_started' | 'in_progress' | 'submitted'
    score: number | null
    submitted_at: string | null
    assignment: Assignment
  }>

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNav name={user.name} level={user.level} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero welcome ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-8 sm:px-8">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -right-4 w-56 h-56 rounded-full bg-white/5" />

          <div className="relative">
            <p className="text-blue-200 text-sm font-medium mb-1">
              {user.level ?? 'English Learner'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {getGreeting(user.name)}
            </h1>
            <p className="text-blue-100 text-sm max-w-md">
              Keep up the great work. Your next lesson is waiting — let&apos;s make today count.
            </p>

            {/* Quick stats */}
            <div className="flex gap-6 mt-6">
              <div>
                <p className="text-2xl font-bold">{homework.length}</p>
                <p className="text-blue-200 text-xs mt-0.5">Tasks due</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold">{lessons?.length ?? 0}</p>
                <p className="text-blue-200 text-xs mt-0.5">Lessons available</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Homework ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Homework</h2>
            {homework.length > 0 && (
              <span className="text-xs text-gray-400">{homework.length} pending</span>
            )}
          </div>

          {homework.length === 0 ? (
            <div className="card text-center py-10">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">All caught up!</p>
              <p className="text-gray-400 text-xs mt-1">No pending homework right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {homework.map(item => {
                const { label: dueLabel, urgent } = formatDue(item.assignment?.due_date ?? null)
                const status = STATUS_CONFIG[item.status]
                const questionCount = Array.isArray(item.assignment?.questions)
                  ? item.assignment.questions.length
                  : 0

                return (
                  <Link key={item.id} href={`/student/homework/${item.assignment?.id}`} className="card flex items-start gap-4 hover:shadow-md transition-shadow block">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm leading-snug">
                          {item.assignment?.title ?? 'Untitled Assignment'}
                        </p>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {questionCount > 0 && (
                          <span className="text-xs text-gray-400">{questionCount} questions</span>
                        )}
                        <span className={`text-xs font-medium ${urgent ? 'text-red-500' : 'text-gray-400'}`}>
                          {dueLabel}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Lessons ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
            {(lessons?.length ?? 0) > 0 && (
              <span className="text-xs text-gray-400">{lessons?.length} available</span>
            )}
          </div>

          {!lessons || lessons.length === 0 ? (
            <div className="card text-center py-10">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No lessons yet</p>
              <p className="text-gray-400 text-xs mt-1">Your teacher hasn&apos;t published any lessons yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(lessons as any[]).map((lesson, i) => {
                const course = lesson.unit?.course
                return (
                  <div key={lesson.id} className="card hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-start gap-3">
                      {/* Number badge */}
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                          {lesson.title}
                        </p>
                        {(course?.title || lesson.unit?.title) && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {course?.title}{lesson.unit?.title ? ` · ${lesson.unit.title}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ABC&apos;s Academy &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
