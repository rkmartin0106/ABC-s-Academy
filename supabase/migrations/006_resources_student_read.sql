-- Migration 006: Allow students to read resources (PDFs, etc.)
-- Run in Supabase SQL Editor

create policy "Students can read resources"
  on resources for select
  using (
    exists (
      select 1 from users
      where id = auth.uid() and role = 'student'
    )
  );
