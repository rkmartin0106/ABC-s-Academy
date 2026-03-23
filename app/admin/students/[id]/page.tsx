import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

const LEVEL_COLORS: Record<string, string> = {
  'A1 Beginner': 'bg-gray-100 text-gray-600',
  'A2 Elementary': 'bg-blue-50 text-blue-700',
  'B1 Intermediate': 'bg-indigo-50 text-indigo-700',
  'B2 Upper Intermediate': 'bg-purple-50 text-purple-700',
  'C1 Advanced': 'bg-green-50 text-green-700',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/student')

  const supabase = createSupabaseServerClient()

  // Fetch student
  const { data: student } = await supabase
    .from('users')
    .select('id, name, email, level, last_active_at, created_at')
    .eq('id', params.id)
    .eq('role', 'student')
    .single()

  if (!student) redirect('/admin')

  // Fetch student's assignments
  const { data: studentAssignments } = await supabase
    .from('student_assignments')
    .select(`
      id, status, score, submitted_at, answers,
      assignment:assignments(id, title, due_date, questions)
    `)
    .eq('student_id', params.id)
    .order('submitted_at', { ascending: false })

  const assignments = (studentAssignments ?? []) as unknown as Array<{
    id: string
    status: 'not_started' | 'in_progress' | 'submitted'
    score: number | null
    submitted_at: string | null
    assignment: {
      id: string
      title: string
      due_date: string | null
      questions: unknown[]
    }
  }>

  const submitted = assignments.filter(a => a.status === 'submitted')
  const pending = assignments.filter(a => a.status !== 'submitted')
  const avgScore = submitted.length
    ? Math.round(submitted.reduce((sum, a) => sum + (a.score ?? 0), 0) / submitted.length)
    : null

  const STATUS_CONFIG = {
    not_started: { label: 'Not started', className: 'bg-gray-100 text-gray-500' },
    in_progress: { label: 'In progress', className: 'bg-yellow-50 text-yellow-700' },
    submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700' },
  } as const

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Back */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back to Dashboard
        </Link>

        {/* Student card */}
        <div className="card">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-blue-700">{getInitials(student.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{student.email}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {student.level && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[student.level] ?? 'bg-gray-100 text-gray-600'}`}>
                    {student.level}
                  </span>
                )}
                <span className="text-xs text-gray-400">Joined {formatDate(student.created_at)}</span>
                {student.last_active_at && (
                  <span className="text-xs text-gray-400">Last active {formatDate(student.last_active_at)}</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Assigned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{submitted.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Submitted</p>
              </div>
              {avgScore !== null && (
                <div className="text-center">
                  <p className={`text-2xl font-bold ${avgScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{avgScore}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">Avg Score</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submitted homework */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submitted Homework</h2>
          {submitted.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm">No homework submitted yet.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Submitted</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {submitted.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{item.assignment?.title ?? 'Untitled'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Array.isArray(item.assignment?.questions) ? item.assignment.questions.length : 0} questions
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                        {formatDate(item.submitted_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {item.score !== null ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.score >= 70 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                          }`}>
                            {item.score}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending homework */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Homework</h2>
            <div className="space-y-3">
              {pending.map(item => {
                const status = STATUS_CONFIG[item.status]
                return (
                  <div key={item.id} className="card flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{item.assignment?.title ?? 'Untitled'}</p>
                      {item.assignment?.due_date && (
                        <p className="text-xs text-gray-400 mt-0.5">Due {formatDate(item.assignment.due_date)}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
