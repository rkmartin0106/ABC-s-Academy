import type { Question } from '@/types'

export type StudentAnswers = Record<string, string>

export interface GradeResult {
  score: number          // 0–100
  correct: number
  total: number
  breakdown: Record<string, boolean>
}

export function gradeHomework(questions: Question[], answers: StudentAnswers): GradeResult {
  let correct = 0
  const breakdown: Record<string, boolean> = {}

  for (const q of questions) {
    const raw = answers[q.id] ?? ''
    let isCorrect = false

    switch (q.type) {
      case 'multiple_choice':
      case 'true_false':
        isCorrect = raw.trim() === String(q.correct_answer).trim()
        break

      case 'fill_in_blank':
        isCorrect = raw.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()
        break

      case 'matching': {
        // correct_answer is JSON: { "left1": "right1", "left2": "right2" }
        // student answer is JSON: same shape
        try {
          const correct_map = JSON.parse(q.correct_answer) as Record<string, string>
          const student_map = JSON.parse(raw) as Record<string, string>
          isCorrect = Object.entries(correct_map).every(
            ([left, right]) => student_map[left]?.trim().toLowerCase() === right.trim().toLowerCase()
          )
        } catch {
          isCorrect = false
        }
        break
      }
    }

    breakdown[q.id] = isCorrect
    if (isCorrect) correct++
  }

  return {
    score: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    correct,
    total: questions.length,
    breakdown,
  }
}
