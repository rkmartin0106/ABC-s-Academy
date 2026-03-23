-- ============================================================
-- ABC's Academy — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────

create type user_role as enum ('teacher', 'student');
create type lesson_status as enum ('draft', 'published');
create type assignment_status as enum ('not_started', 'in_progress', 'submitted');
create type resource_type as enum ('pdf', 'audio', 'video');

-- ─── Users ───────────────────────────────────────────────────

create table users (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique not null,
  name        text not null,
  role        user_role not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ─── Courses ─────────────────────────────────────────────────

create table courses (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  teacher_id  uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ─── Units ───────────────────────────────────────────────────

create table units (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  order_index integer not null default 0
);

-- ─── Lessons ─────────────────────────────────────────────────

create table lessons (
  id             uuid primary key default uuid_generate_v4(),
  unit_id        uuid not null references units(id) on delete cascade,
  title          text not null,
  content_blocks jsonb not null default '[]',
  status         lesson_status not null default 'draft',
  created_at     timestamptz not null default now()
);

-- ─── Assignments ─────────────────────────────────────────────

create table assignments (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  lesson_id  uuid references lessons(id) on delete set null,
  questions  jsonb not null default '[]',
  due_date   timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Student Assignments ─────────────────────────────────────

create table student_assignments (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid not null references users(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  status        assignment_status not null default 'not_started',
  score         numeric(5, 2),
  answers       jsonb,
  submitted_at  timestamptz,
  unique (student_id, assignment_id)
);

-- ─── Messages ────────────────────────────────────────────────

create table messages (
  id          uuid primary key default uuid_generate_v4(),
  sender_id   uuid not null references users(id) on delete cascade,
  receiver_id uuid not null references users(id) on delete cascade,
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Resources ───────────────────────────────────────────────

create table resources (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  type       resource_type not null,
  file_url   text not null,
  created_at timestamptz not null default now()
);

-- ─── Video Sessions ──────────────────────────────────────────

create table video_sessions (
  id           uuid primary key default uuid_generate_v4(),
  teacher_id   uuid not null references users(id) on delete cascade,
  title        text not null,
  scheduled_at timestamptz not null,
  room_url     text not null,
  created_at   timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────

create index on courses (teacher_id);
create index on units (course_id);
create index on lessons (unit_id);
create index on assignments (lesson_id);
create index on student_assignments (student_id);
create index on student_assignments (assignment_id);
create index on messages (sender_id);
create index on messages (receiver_id);
create index on video_sessions (teacher_id);
create index on video_sessions (scheduled_at);
