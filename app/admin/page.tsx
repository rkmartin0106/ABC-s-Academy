import { requireRole } from '@/lib/auth'

export default async function AdminDashboard() {
  const user = await requireRole('teacher')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name} 👋</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder cards — replace with real stats */}
          <StatCard label="Courses" value="—" />
          <StatCard label="Students" value="—" />
          <StatCard label="Assignments Due" value="—" />
        </div>
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
