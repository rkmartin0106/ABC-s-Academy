-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table users enable row level security;
alter table courses enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;
alter table assignments enable row level security;
alter table student_assignments enable row level security;
alter table messages enable row level security;
alter table resources enable row level security;
alter table video_sessions enable row level security;

-- ─── Helper: get current user's role ─────────────────────────

create or replace function get_my_role()
returns user_role as $$
  select role from users where id = auth.uid()
$$ language sql security definer;

-- ─── Users ───────────────────────────────────────────────────

create policy "Users can read their own profile"
  on users for select
  using (id = auth.uid());

create policy "Teachers can read all users"
  on users for select
  using (get_my_role() = 'teacher');

-- ─── Courses ─────────────────────────────────────────────────

create policy "Teachers can manage their own courses"
  on courses for all
  using (teacher_id = auth.uid());

create policy "Students can read published courses"
  on courses for select
  using (get_my_role() = 'student');

-- ─── Units ───────────────────────────────────────────────────

create policy "Teachers can manage units"
  on units for all
  using (
    exists (
      select 1 from courses
      where courses.id = units.course_id
        and courses.teacher_id = auth.uid()
    )
  );

create policy "Students can read units"
  on units for select
  using (get_my_role() = 'student');

-- ─── Lessons ─────────────────────────────────────────────────

create policy "Teachers can manage lessons"
  on lessons for all
  using (
    exists (
      select 1 from units
      join courses on courses.id = units.course_id
      where units.id = lessons.unit_id
        and courses.teacher_id = auth.uid()
    )
  );

create policy "Students can read published lessons"
  on lessons for select
  using (status = 'published' and get_my_role() = 'student');

-- ─── Assignments ─────────────────────────────────────────────

create policy "Teachers can manage assignments"
  on assignments for all
  using (get_my_role() = 'teacher');

create policy "Students can read assignments"
  on assignments for select
  using (get_my_role() = 'student');

-- ─── Student Assignments ─────────────────────────────────────

create policy "Students can manage their own submissions"
  on student_assignments for all
  using (student_id = auth.uid());

create policy "Teachers can read all submissions"
  on student_assignments for select
  using (get_my_role() = 'teacher');

-- ─── Messages ────────────────────────────────────────────────

create policy "Users can read their own messages"
  on messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can send messages"
  on messages for insert
  with check (sender_id = auth.uid());

-- ─── Resources ───────────────────────────────────────────────

create policy "Teachers can manage resources"
  on resources for all
  using (get_my_role() = 'teacher');

create policy "Students can read resources"
  on resources for select
  using (get_my_role() = 'student');

-- ─── Video Sessions ──────────────────────────────────────────

create policy "Teachers can manage their video sessions"
  on video_sessions for all
  using (teacher_id = auth.uid());

create policy "Students can read video sessions"
  on video_sessions for select
  using (get_my_role() = 'student');
