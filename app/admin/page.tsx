import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import StudentsSection from '@/components/admin/StudentsSection'
import type { StudentRow } from '@/components/admin/AddStudentModal'

export default async function AdminDashboard() {
  const user = await getSessionUser()

  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/student')

  // Fetch students server-side for the initial render
  const supabase = createSupabaseServerClient()
  const { data: students } = await supabase
    .from('users')
    .select('id, name, email, level, last_active_at, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name} 👋</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="Courses" value="—" />
          <StatCard label="Students" value={String(students?.length ?? 0)} />
          <StatCard label="Assignments Due" value="—" />
        </div>

        {/* Students section */}
        <StudentsSection initialStudents={(students as StudentRow[]) ?? []} />
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-4xl font-bold text-brand-700">{value}</p>
    </div>
  )
}
