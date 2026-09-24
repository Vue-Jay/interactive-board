create table if not exists public.live_lessons (
 id uuid primary key, teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade, board_id uuid not null references public.boards(id) on delete cascade,
 topic text not null default '', started_at timestamptz not null default now(), ended_at timestamptz,
 result text not null default '', homework text not null default '', created_at timestamptz not null default now()
);
alter table public.live_lessons enable row level security;
drop policy if exists "teacher manages live lessons" on public.live_lessons;
create policy "teacher manages live lessons" on public.live_lessons for all to authenticated using (teacher_id=auth.uid())
with check (teacher_id=auth.uid() and exists(select 1 from public.boards b where b.id=live_lessons.board_id and b.owner_id=auth.uid())
and exists(select 1 from public.board_members bm where bm.board_id=live_lessons.board_id and bm.user_id=live_lessons.student_id));
create unique index if not exists one_active_lesson_per_board on public.live_lessons(board_id) where ended_at is null;
grant select,insert,update,delete on public.live_lessons to authenticated;
