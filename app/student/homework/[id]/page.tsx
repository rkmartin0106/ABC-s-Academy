'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Question, MatchingPair } from '@/types'

interface AssignmentData {
  id: string
  title: string
  due_date: string | null
  questions: Question[]
}

interface StudentAssignment {
  id: string
  status: string
  score: number | null
  answers: Record<string, string> | null
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ─── Question Components ──────────────────────────────────────────────────────

function MultipleChoice({ q, value, onChange, disabled, result }: {
  q: Question; value: string; onChange: (v: string) => void; disabled: boolean; result?: boolean
}) {
  return (
    <div className="space-y-2">
      {(q.options ?? []).map((opt, i) => {
        const isSelected = value === opt
        const showCorrect = disabled && String(q.correct_answer) === opt
        const showWrong = disabled && isSelected && !showCorrect
        return (
          <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
            disabled ? 'cursor-default' : 'hover:bg-blue-50 hover:border-blue-200'
          } ${showCorrect ? 'bg-green-50 border-green-400' : showWrong ? 'bg-red-50 border-red-400' : isSelected ? 'bg-blue-50 border-blue-400' : 'border-gray-200'}`}>
            <input type="radio" name={q.id} value={opt} checked={isSelected} onChange={() => onChange(opt)} disabled={disabled} className="text-blue-600" />
            <span className="text-sm text-gray-800">{opt}</span>
            {showCorrect && <span className="ml-auto text-xs text-green-600 font-medium">✓ Correct</span>}
            {showWrong && <span className="ml-auto text-xs text-red-600 font-medium">✗ Wrong</span>}
          </label>
        )
      })}
    </div>
  )
}

function TrueFalse({ q, value, onChange, disabled }: {
  q: Question; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  return (
    <div className="flex gap-3">
      {['True', 'False'].map(opt => {
        const isSelected = value === opt
        const showCorrect = disabled && String(q.correct_answer) === opt
        const showWrong = disabled && isSelected && !showCorrect
        return (
          <label key={opt} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition font-medium text-sm ${
            showCorrect ? 'bg-green-50 border-green-400 text-green-700' :
            showWrong ? 'bg-red-50 border-red-400 text-red-700' :
            isSelected ? 'bg-blue-50 border-blue-400 text-blue-700' :
            'border-gray-200 text-gray-700 hover:bg-gray-50'
          } ${disabled ? 'cursor-default' : 'hover:bg-blue-50 hover:border-blue-200'}`}>
            <input type="radio" name={q.id} value={opt} checked={isSelected} onChange={() => onChange(opt)} disabled={disabled} className="sr-only" />
            {opt}
          </label>
        )
      })}
    </div>
  )
}

function FillInBlank({ q, value, onChange, disabled }: {
  q: Question; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  const isCorrect = disabled && value.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? (isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-gray-300'
        }`}
      />
      {disabled && (
        <p className={`text-xs font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
          {isCorrect ? '✓ Correct' : `✗ Correct answer: ${q.correct_answer}`}
        </p>
      )}
    </div>
  )
}

function Matching({ q, value, onChange, disabled }: {
  q: Question; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  const pairs = q.pairs ?? []
  const [rightOptions] = useState(() => shuffleArray(pairs.map(p => p.right)))

  let studentMap: Record<string, string> = {}
  try { studentMap = value ? JSON.parse(value) : {} } catch { studentMap = {} }

  function handleSelect(left: string, right: string) {
    const updated = { ...studentMap, [left]: right }
    onChange(JSON.stringify(updated))
  }

  let correctMap: Record<string, string> = {}
  try { correctMap = JSON.parse(q.correct_answer) } catch {}

  return (
    <div className="space-y-2">
      {pairs.map(pair => {
        const selected = studentMap[pair.left] ?? ''
        const isCorrect = disabled && correctMap[pair.left] === selected
        return (
          <div key={pair.left} className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-800 font-medium">
              {pair.left}
            </div>
            <span className="text-gray-400 text-xs">→</span>
            <select
              value={selected}
              onChange={e => handleSelect(pair.left, e.target.value)}
              disabled={disabled}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                disabled ? (isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-gray-300'
              }`}
            >
              <option value="">Select...</option>
              {rightOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {disabled && (
              <span className={`text-xs font-medium w-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
            )}
          </div>
        )
      })}
      {disabled && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Correct answers:</p>
          {pairs.map(pair => (
            <p key={pair.left} className="text-xs text-gray-600">
              {pair.left} → <span className="font-medium">{correctMap[pair.left]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [assignment, setAssignment] = useState<AssignmentData | null>(null)
  const [studentAssignment, setStudentAssignment] = useState<StudentAssignment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; total: number; breakdown: Record<string, boolean> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: sa } = await supabase
      .from('student_assignments')
      .select('id, status, score, answers, assignment:assignments(id, title, due_date, questions)')
      .eq('assignment_id', id)
      .eq('student_id', user.id)
      .single()

    if (!sa) { setError('Assignment not found or not assigned to you.'); setLoading(false); return }

    const asgn = (sa as any).assignment as AssignmentData
    setAssignment(asgn)
    setStudentAssignment({ id: sa.id, status: sa.status, score: sa.score, answers: sa.answers })

    if (sa.status === 'submitted' && sa.answers) {
      setAnswers(sa.answers as Record<string, string>)
    }

    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchData() }, [fetchData])

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    if (!assignment) return
    const unanswered = assignment.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) {
      setError(`Please answer all questions before submitting. (${unanswered.length} remaining)`)
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/homework/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSubmitting(false); return }
    setResult(json)
    setStudentAssignment(prev => prev ? { ...prev, status: 'submitted', score: json.score } : prev)
  }

  const isSubmitted = studentAssignment?.status === 'submitted'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !assignment) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={() => router.push('/student')} className="mt-4 text-blue-600 text-sm hover:underline">← Back to portal</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/student')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Back
          </button>
          <span className="text-sm font-medium text-gray-700">
            {isSubmitted ? `Score: ${studentAssignment?.score ?? 0}%` : `${Object.keys(answers).length} / ${assignment?.questions.length ?? 0} answered`}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment?.title}</h1>
          {assignment?.due_date && (
            <p className="text-sm text-gray-400 mt-1">
              Due {new Date(assignment.due_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Score banner */}
        {isSubmitted && (
          <div className={`rounded-xl p-5 text-center ${(studentAssignment?.score ?? 0) >= 70 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className="text-4xl font-extrabold mb-1" style={{ color: (studentAssignment?.score ?? 0) >= 70 ? '#16a34a' : '#ea580c' }}>
              {studentAssignment?.score ?? 0}%
            </p>
            <p className="text-sm font-medium text-gray-600">
              {result ? `${result.correct} of ${result.total} correct` : 'Submitted'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(studentAssignment?.score ?? 0) >= 70 ? '🎉 Great work!' : '📚 Keep practising!'}
            </p>
          </div>
        )}

        {/* Questions */}
        {(assignment?.questions ?? []).map((q, i) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-gray-900 font-medium leading-snug">{q.prompt}</p>
            </div>

            <div className="pl-9">
              {q.type === 'multiple_choice' && (
                <MultipleChoice q={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} disabled={isSubmitted} />
              )}
              {q.type === 'true_false' && (
                <TrueFalse q={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} disabled={isSubmitted} />
              )}
              {q.type === 'fill_in_blank' && (
                <FillInBlank q={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} disabled={isSubmitted} />
              )}
              {q.type === 'matching' && (
                <Matching q={q} value={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} disabled={isSubmitted} />
              )}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        {/* Submit */}
        {!isSubmitted && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Grading…</>
            ) : 'Submit Homework'}
          </button>
        )}

        {isSubmitted && (
          <button onClick={() => router.push('/student')} className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl text-sm hover:bg-gray-50 transition">
            ← Back to portal
          </button>
        )}
      </div>
    </div>
  )
}
