// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'teacher' | 'student'

export type StudentLevel =
  | 'A1 Beginner'
  | 'A2 Elementary'
  | 'B1 Intermediate'
  | 'B2 Upper Intermediate'
  | 'C1 Advanced'

export const STUDENT_LEVELS: StudentLevel[] = [
  'A1 Beginner',
  'A2 Elementary',
  'B1 Intermediate',
  'B2 Upper Intermediate',
  'C1 Advanced',
]

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  level: StudentLevel | null
  avatar_url: string | null
  created_at: string
  last_active_at: string | null
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface Course {
  id: string
  title: string
  description: string | null
  teacher_id: string
  created_at: string
}

export interface Unit {
  id: string
  course_id: string
  title: string
  order_index: number
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export type LessonStatus = 'draft' | 'published'

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'video'; url: string; caption?: string }
  | { type: 'audio'; url: string; caption?: string }
  | { type: 'quiz'; question: string; options: string[]; answer: number }

export interface Lesson {
  id: string
  unit_id: string
  title: string
  content_blocks: ContentBlock[]
  status: LessonStatus
  created_at: string
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'short_answer' | 'fill_in_blank'

export interface Question {
  id: string
  type: QuestionType
  prompt: string
  options?: string[]
  correct_answer: string | number
}

export interface Assignment {
  id: string
  title: string
  lesson_id: string | null
  questions: Question[]
  due_date: string | null
  created_at: string
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'submitted'

export interface StudentAssignment {
  id: string
  student_id: string
  assignment_id: string
  status: AssignmentStatus
  score: number | null
  answers: Record<string, string | number> | null
  submitted_at: string | null
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

// ─── Resources ───────────────────────────────────────────────────────────────

export type ResourceType = 'pdf' | 'audio' | 'video'

export interface Resource {
  id: string
  title: string
  type: ResourceType
  file_url: string
  created_at: string
}

// ─── Video Sessions ───────────────────────────────────────────────────────────

export interface VideoSession {
  id: string
  teacher_id: string
  title: string
  scheduled_at: string
  room_url: string
  created_at: string
}

// ─── Telegram ────────────────────────────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
}
