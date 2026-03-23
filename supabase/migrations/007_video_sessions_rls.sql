-- Migration 007: Video sessions RLS policies
-- Run in Supabase SQL Editor

-- Teachers can manage their own video sessions
create policy "Teachers manage video sessions"
  on video_sessions for all
  using (
    exists (select 1 from users where id = auth.uid() and role = 'teacher')
  );

-- Students can read video sessions (to join)
create policy "Students read video sessions"
  on video_sessions for select
  using (
    exists (select 1 from users where id = auth.uid() and role = 'student')
  );
