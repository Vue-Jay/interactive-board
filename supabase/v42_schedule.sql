-- OnlineRepetitor v42: schedule
create table if not exists public.scheduled_lessons(
 id uuid primary key,
 teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 board_id uuid references public.boards(id) on delete set null,
 title text not null default 'Занятие',
 starts_at timestamptz not null,
 duration_minutes integer not null default 60 check(duration_minutes between 15 and 480),
 recurrence text not null default 'none' check(recurrence in('none','weekly')),
 recurrence_group_id uuid,
 note text not null default '',
 status text not null default 'planned' check(status in('planned','completed','cancelled')),
 created_at timestamptz not null default now()
);
alter table public.scheduled_lessons enable row level security;
drop policy if exists "schedule participants read" on public.scheduled_lessons;
drop policy if exists "schedule teacher insert" on public.scheduled_lessons;
drop policy if exists "schedule teacher update" on public.scheduled_lessons;
drop policy if exists "schedule teacher delete" on public.scheduled_lessons;
create policy "schedule participants read" on public.scheduled_lessons for select to authenticated using(teacher_id=auth.uid() or student_id=auth.uid());
create policy "schedule teacher insert" on public.scheduled_lessons for insert to authenticated with check(teacher_id=auth.uid() and exists(select 1 from public.boards b join public.board_members bm on bm.board_id=b.id where b.owner_id=auth.uid() and bm.user_id=scheduled_lessons.student_id and (scheduled_lessons.board_id is null or b.id=scheduled_lessons.board_id)));
create policy "schedule teacher update" on public.scheduled_lessons for update to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
create policy "schedule teacher delete" on public.scheduled_lessons for delete to authenticated using(teacher_id=auth.uid());
create index if not exists scheduled_lessons_teacher_time_idx on public.scheduled_lessons(teacher_id,starts_at);
create index if not exists scheduled_lessons_student_time_idx on public.scheduled_lessons(student_id,starts_at);
create index if not exists scheduled_lessons_group_idx on public.scheduled_lessons(recurrence_group_id);
grant select,insert,update,delete on public.scheduled_lessons to authenticated;
