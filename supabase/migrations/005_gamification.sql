-- ============================================================
-- Migration 005: Gamification — XP, badges, streaks
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add XP and streak columns to users
alter table users
  add column if not exists xp integer not null default 0,
  add column if not exists streak_days integer not null default 0,
  add column if not exists last_submission_date date;

-- Badges table
create table if not exists user_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references users(id) on delete cascade,
  badge_type text not null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_type)
);

create index if not exists on user_badges (user_id);

-- RLS: students can read their own badges, teachers can read all
alter table user_badges enable row level security;

create policy "Students read own badges"
  on user_badges for select
  using (auth.uid() = user_id);

create policy "Teachers read all badges"
  on user_badges for select
  using (
    exists (
      select 1 from users
      where id = auth.uid() and role = 'teacher'
    )
  );

create policy "Service role manages badges"
  on user_badges for all
  using (auth.role() = 'service_role');
