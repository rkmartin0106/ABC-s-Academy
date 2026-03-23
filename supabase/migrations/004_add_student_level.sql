-- ============================================================
-- Add level and last_active_at to users table
-- ============================================================

create type student_level as enum (
  'A1 Beginner',
  'A2 Elementary',
  'B1 Intermediate',
  'B2 Upper Intermediate',
  'C1 Advanced'
);

alter table users
  add column level student_level,
  add column last_active_at timestamptz;
