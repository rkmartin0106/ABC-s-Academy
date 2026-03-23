import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import StudentNav from '@/components/student/StudentNav'
import GamificationWidget from '@/components/student/GamificationWidget'
import type { Assignment, Lesson } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const first = name.split(' ')[0]
  if (hour < 12) return `Good morning, ${first}`
  if (hour < 17) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

function getGreetingIcon(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '☀️'
  if (hour < 17) return '👋'
  return '🌙'
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
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700 border border-green-200' },
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-8 sm:px-10 sm:py-10 shadow-xl">
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-14 -right-4 w-72 h-72 rounded-full bg-indigo-900/40" />
          <div className="absolute top-6 right-8 w-20 h-20 rounded-full bg-white/5 hidden sm:block" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{getGreetingIcon()}</span>
              {user.level && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100">
                  {user.level}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">
              {getGreeting(user.name)}
            </h1>
            <p className="text-blue-200 text-sm max-w-md leading-relaxed">
              Keep up the great work. Your next lesson is waiting — let&apos;s make today count.
            </p>

            {/* Quick stats */}
            <div className="flex gap-8 mt-7">
              <div>
                <p className="text-3xl font-extrabold">{homework.length}</p>
                <p className="text-blue-300 text-xs mt-0.5 font-medium">Tasks due</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-3xl font-extrabold">{lessons?.length ?? 0}</p>
                <p className="text-blue-300 text-xs mt-0.5 font-medium">Lessons available</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Gamification ─────────────────────────────────────────── */}
        <GamificationWidget />

        {/* ── Homework ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Homework</h2>
            {homework.length > 0 && (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{homework.length} pending</span>
            )}
          </div>

          {homework.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-gray-700 text-sm font-semibold">All caught up!</p>
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
                  <Link key={item.id} href={`/student/homework/${item.assignment?.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-4 hover:shadow-md hover:border-blue-100 transition-all block group">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition-colors">
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

                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Lessons ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Lessons</h2>
            {(lessons?.length ?? 0) > 0 && (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{lessons?.length} available</span>
            )}
          </div>

          {!lessons || lessons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="text-gray-700 text-sm font-semibold">No lessons yet</p>
              <p className="text-gray-400 text-xs mt-1">Your teacher hasn&apos;t published any lessons yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(lessons as any[]).map((lesson, i) => {
                const course = lesson.unit?.course
                const colors = [
                  'bg-blue-50 text-blue-600',
                  'bg-indigo-50 text-indigo-600',
                  'bg-violet-50 text-violet-600',
                  'bg-sky-50 text-sky-600',
                ]
                const color = colors[i % colors.length]
                return (
                  <Link key={lesson.id} href={`/student/lessons/${lesson.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group block p-4">
                    <div className="flex items-start gap-3">
                      {/* Number badge */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color.split(' ')[0]}`}>
                        <span className={`text-sm font-bold ${color.split(' ')[1]}`}>{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                          {lesson.title}
                        </p>
                        {(course?.title || lesson.unit?.title) && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {course?.title}{lesson.unit?.title ? ` · ${lesson.unit.title}` : ''}
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-200 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
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
