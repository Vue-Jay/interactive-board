-- OnlineRepetitor v37
-- Run once in Supabase SQL Editor.

create table if not exists public.student_profiles (
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '',
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

create table if not exists public.student_sessions (
  id uuid primary key,
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid references public.boards(id) on delete set null,
  date timestamptz not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0 and duration_minutes <= 1440),
  topic text not null default '',
  homework text not null default '',
  result text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
alter table public.student_sessions enable row level security;

drop policy if exists "teacher owns student profiles" on public.student_profiles;
create policy "teacher owns student profiles" on public.student_profiles
for all to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.boards b
    join public.board_members bm on bm.board_id=b.id
    where b.owner_id=auth.uid() and bm.user_id=student_profiles.student_id
  )
);

drop policy if exists "teacher owns student sessions" on public.student_sessions;
create policy "teacher owns student sessions" on public.student_sessions
for all to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.boards b
    join public.board_members bm on bm.board_id=b.id
    where b.owner_id=auth.uid() and bm.user_id=student_sessions.student_id
  )
  and (board_id is null or exists (
    select 1 from public.boards b where b.id=student_sessions.board_id and b.owner_id=auth.uid()
  ))
);

create index if not exists student_profiles_teacher_idx on public.student_profiles(teacher_id);
create index if not exists student_sessions_teacher_student_date_idx on public.student_sessions(teacher_id,student_id,date desc);

grant select,insert,update,delete on public.student_profiles to authenticated;
grant select,insert,update,delete on public.student_sessions to authenticated;
