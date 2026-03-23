'use client'

import { useState, useEffect, FormEvent } from 'react'
import type { Question, QuestionType, MatchingPair } from '@/types'

interface StudentOption { id: string; name: string; email: string }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  fill_in_blank: 'Fill in Blank',
  true_false: 'True / False',
  matching: 'Matching',
}

function uid() { return Math.random().toString(36).slice(2) }

const EMPTY_QUESTION = (): Question => ({
  id: uid(),
  type: 'multiple_choice',
  prompt: '',
  options: ['', '', '', ''],
  correct_answer: '',
})

export default function CreateHomeworkModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>([EMPTY_QUESTION()])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<'questions' | 'assign'>('questions')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(''); setDueDate(''); setQuestions([EMPTY_QUESTION()])
    setSelectedStudents(new Set()); setStep('questions'); setError(null)
    fetch('/api/students').then(r => r.json()).then(d => setStudents(d.students ?? []))
  }, [open])

  function updateQuestion(i: number, patch: Partial<Question>) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  }

  function addQuestion() { setQuestions(prev => [...prev, EMPTY_QUESTION()]) }
  function removeQuestion(i: number) { setQuestions(prev => prev.filter((_, idx) => idx !== i)) }

  function toggleStudent(id: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedStudents(prev =>
      prev.size === students.length ? new Set() : new Set(students.map(s => s.id))
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate
    for (const q of questions) {
      if (!q.prompt.trim()) { setError('All questions must have a prompt.'); return }
      if (q.type === 'multiple_choice') {
        if ((q.options ?? []).filter(o => o.trim()).length < 2) { setError('Multiple choice needs at least 2 options.'); return }
        if (!q.correct_answer) { setError('Multiple choice needs a correct answer selected.'); return }
      }
      if (q.type === 'fill_in_blank' && !q.correct_answer.trim()) { setError('Fill in blank needs a correct answer.'); return }
      if (q.type === 'true_false' && !q.correct_answer) { setError('True/False needs a correct answer.'); return }
      if (q.type === 'matching') {
        const pairs = q.pairs ?? []
        if (pairs.length < 2) { setError('Matching needs at least 2 pairs.'); return }
        if (pairs.some(p => !p.left.trim() || !p.right.trim())) { setError('All matching pairs must be filled in.'); return }
      }
    }

    setLoading(true)
    const correctAnswers = questions.map(q => {
      if (q.type === 'matching') {
        const map: Record<string, string> = {}
        for (const p of q.pairs ?? []) map[p.left] = p.right
        return { ...q, correct_answer: JSON.stringify(map) }
      }
      return q
    })

    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        questions: correctAnswers,
        due_date: dueDate || null,
        studentIds: Array.from(selectedStudents),
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setLoading(false); return }
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Homework</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-gray-100">
          {(['questions', 'assign'] as const).map((s, i) => (
            <button key={s} onClick={() => setStep(s)} className={`flex-1 py-2.5 text-sm font-medium transition ${step === s ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400 hover:text-gray-600'}`}>
              {i + 1}. {s === 'questions' ? 'Questions' : 'Assign to Students'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {step === 'questions' && (
            <div className="p-6 space-y-5">
              {/* Title + due date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Homework Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unit 3 Vocabulary Quiz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <QuestionEditor key={q.id} q={q} index={i} onChange={patch => updateQuestion(i, patch)} onRemove={() => removeQuestion(i)} canRemove={questions.length > 1} />
                ))}
              </div>

              <button type="button" onClick={addQuestion}
                className="w-full border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Question
              </button>
            </div>
          )}

          {step === 'assign' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Select which students to assign this homework to.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{students.length} students</span>
                <button type="button" onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
                  {selectedStudents.size === students.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {students.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {students.map(s => (
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedStudents.has(s.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} className="text-blue-600 rounded" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="mx-6 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step === 'questions' ? (
            <>
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button type="button" onClick={() => { if (!title.trim()) { setError('Add a title first.'); return } setError(null); setStep('assign') }}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition">
                Next: Assign →
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep('questions')} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">← Back</button>
              <button type="submit" onClick={handleSubmit} disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Creating…</> : 'Create Homework'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Question Editor ──────────────────────────────────────────────────────────

function QuestionEditor({ q, index, onChange, onRemove, canRemove }: {
  q: Question; index: number; onChange: (patch: Partial<Question>) => void; onRemove: () => void; canRemove: boolean
}) {
  function handleTypeChange(type: QuestionType) {
    const base: Partial<Question> = { type, correct_answer: '' }
    if (type === 'multiple_choice') base.options = ['', '', '', '']
    else if (type === 'true_false') { base.options = ['True', 'False']; base.correct_answer = 'True' }
    else if (type === 'matching') base.pairs = [{ left: '', right: '' }, { left: '', right: '' }]
    onChange(base)
  }

  function updateOption(i: number, val: string) {
    const opts = [...(q.options ?? [])]
    opts[i] = val
    onChange({ options: opts })
  }

  function addOption() { onChange({ options: [...(q.options ?? []), ''] }) }
  function removeOption(i: number) { onChange({ options: (q.options ?? []).filter((_, idx) => idx !== i) }) }

  function updatePair(i: number, side: 'left' | 'right', val: string) {
    const pairs = [...(q.pairs ?? [])]
    pairs[i] = { ...pairs[i], [side]: val }
    onChange({ pairs })
  }
  function addPair() { onChange({ pairs: [...(q.pairs ?? []), { left: '', right: '' }] }) }
  function removePair(i: number) { onChange({ pairs: (q.pairs ?? []).filter((_, idx) => idx !== i) }) }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>
        <select value={q.type} onChange={e => handleTypeChange(e.target.value as QuestionType)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700">
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove} className="ml-auto text-gray-300 hover:text-red-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <input value={q.prompt} onChange={e => onChange({ prompt: e.target.value })} placeholder="Question prompt..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {q.type === 'multiple_choice' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Options — click radio to mark correct</p>
          {(q.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct-${q.id}`} checked={q.correct_answer === opt && opt !== ''}
                onChange={() => opt && onChange({ correct_answer: opt })} className="text-blue-600 shrink-0" />
              <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {(q.options ?? []).length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} className="text-xs text-blue-600 hover:underline">+ Add option</button>
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="flex gap-3">
          {['True', 'False'].map(v => (
            <label key={v} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${q.correct_answer === v ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name={`tf-${q.id}`} value={v} checked={q.correct_answer === v} onChange={() => onChange({ correct_answer: v })} className="sr-only" />
              {v}
            </label>
          ))}
        </div>
      )}

      {q.type === 'fill_in_blank' && (
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Correct answer</label>
          <input value={q.correct_answer} onChange={e => onChange({ correct_answer: e.target.value })} placeholder="Expected answer..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {q.type === 'matching' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Matching pairs</p>
          {(q.pairs ?? []).map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={pair.left} onChange={e => updatePair(i, 'left', e.target.value)} placeholder="Left item"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-xs">→</span>
              <input value={pair.right} onChange={e => updatePair(i, 'right', e.target.value)} placeholder="Right item"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {(q.pairs ?? []).length > 2 && (
                <button type="button" onClick={() => removePair(i)} className="text-gray-300 hover:text-red-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addPair} className="text-xs text-blue-600 hover:underline">+ Add pair</button>
        </div>
      )}
    </div>
  )
}
