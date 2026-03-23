'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

interface OverviewData {
  studentAverages: Array<{ name: string; avgScore: number; count: number }>
  activityTimeline: Array<{ date: string; count: number }>
}

interface StudentAnalyticsData {
  scoreTimeline: Array<{ date: string; score: number; title: string }>
  questionBreakdown: Array<{ type: string; correct: number; total: number; pct: number }>
  completionRate: number
  totalSubmitted: number
  totalAssigned: number
  avgScore: number | null
}

interface Student { id: string; name: string; email: string; level: string | null }

export default function AnalyticsSection() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<StudentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentLoading, setStudentLoading] = useState(false)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    const [overviewRes, studentsRes] = await Promise.all([
      fetch('/api/analytics'),
      fetch('/api/students'),
    ])
    if (overviewRes.ok) setOverview(await overviewRes.json())
    if (studentsRes.ok) {
      const d = await studentsRes.json()
      setStudents(d.students ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOverview() }, [fetchOverview])

  async function loadStudentAnalytics(id: string) {
    setSelectedStudent(id)
    setStudentLoading(true)
    const res = await fetch(`/api/analytics?studentId=${id}`)
    if (res.ok) setStudentData(await res.json())
    setStudentLoading(false)
  }

  if (loading) return (
    <section>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
      <div className="card flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </section>
  )

  return (
    <section className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>

      {/* ── Overview ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Student avg scores */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Average Score by Student</h3>
          {(overview?.studentAverages ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No submissions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview?.studentAverages} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: unknown) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avgScore" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity timeline */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Submissions (Last 30 Days)</h3>
          {(overview?.activityTimeline ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview?.activityTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Per-Student Deep Dive ─────────────────────────────── */}
      <div className="card space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700">Student Deep Dive</h3>
          <select
            value={selectedStudent ?? ''}
            onChange={e => e.target.value && loadStudentAnalytics(e.target.value)}
            className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select a student…</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {studentLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!selectedStudent && !studentLoading && (
          <p className="text-gray-400 text-sm text-center py-8">Select a student to see their analytics</p>
        )}

        {studentData && !studentLoading && (
          <div className="space-y-6">
            {/* Stat pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Avg Score', value: studentData.avgScore !== null ? `${studentData.avgScore}%` : '—', color: 'text-blue-600' },
                { label: 'Submitted', value: String(studentData.totalSubmitted), color: 'text-green-600' },
                { label: 'Assigned', value: String(studentData.totalAssigned), color: 'text-gray-700' },
                { label: 'Completion', value: `${studentData.completionRate}%`, color: studentData.completionRate >= 70 ? 'text-green-600' : 'text-orange-500' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Score over time */}
            {studentData.scoreTimeline.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score Over Time</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={studentData.scoreTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: unknown) => [`${v}%`, 'Score']} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Question type breakdown */}
            {studentData.questionBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Performance by Question Type</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={studentData.questionBreakdown}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="type" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} />
                      <Radar dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {studentData.questionBreakdown.map(q => (
                      <div key={q.type}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium">{q.type}</span>
                          <span className={`font-semibold ${q.pct >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{q.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${q.pct >= 70 ? 'bg-green-400' : 'bg-orange-400'}`}
                            style={{ width: `${q.pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{q.correct}/{q.total} correct</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
