-- OnlineRepetitor v40: assignments and submissions
create table if not exists public.assignments (
 id uuid primary key,
 teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 board_id uuid references public.boards(id) on delete set null,
 title text not null check (char_length(title) between 1 and 200),
 description text not null default '',
 due_at timestamptz,
 max_score integer not null default 100 check (max_score between 1 and 10000),
 created_at timestamptz not null default now()
);
create table if not exists public.submissions (
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 content text not null default '',
 submitted_at timestamptz not null default now(),
 score numeric,
 feedback text not null default '',
 reviewed_at timestamptz,
 primary key (assignment_id,student_id)
);
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "assignment teacher read" on public.assignments;
drop policy if exists "assignment student read" on public.assignments;
drop policy if exists "assignment teacher insert" on public.assignments;
drop policy if exists "assignment teacher update" on public.assignments;
drop policy if exists "assignment teacher delete" on public.assignments;
create policy "assignment teacher read" on public.assignments for select to authenticated using (teacher_id=auth.uid());
create policy "assignment student read" on public.assignments for select to authenticated using (student_id=auth.uid());
create policy "assignment teacher insert" on public.assignments for insert to authenticated with check (
 teacher_id=auth.uid()
 and exists(select 1 from public.boards b join public.board_members bm on bm.board_id=b.id where b.owner_id=auth.uid() and bm.user_id=assignments.student_id and (assignments.board_id is null or b.id=assignments.board_id))
);
create policy "assignment teacher update" on public.assignments for update to authenticated using (teacher_id=auth.uid()) with check (teacher_id=auth.uid());
create policy "assignment teacher delete" on public.assignments for delete to authenticated using (teacher_id=auth.uid());

drop policy if exists "submission participants read" on public.submissions;
create policy "submission participants read" on public.submissions for select to authenticated using (
 student_id=auth.uid() or exists(select 1 from public.assignments a where a.id=submissions.assignment_id and a.teacher_id=auth.uid())
);

create or replace function public.submit_assignment(p_assignment_id uuid,p_content text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.assignments;
begin
 select * into a from public.assignments where id=p_assignment_id and student_id=auth.uid();
 if a.id is null then raise exception 'assignment_not_available'; end if;
 insert into public.submissions(assignment_id,student_id,content,submitted_at,score,feedback,reviewed_at)
 values(a.id,auth.uid(),coalesce(p_content,''),now(),null,'',null)
 on conflict(assignment_id,student_id) do update set content=excluded.content,submitted_at=now(),score=null,feedback='',reviewed_at=null;
end $$;

create or replace function public.review_assignment(p_assignment_id uuid,p_score numeric,p_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.assignments;
begin
 select * into a from public.assignments where id=p_assignment_id and teacher_id=auth.uid();
 if a.id is null then raise exception 'assignment_not_available'; end if;
 if p_score is not null and (p_score<0 or p_score>a.max_score) then raise exception 'invalid_score'; end if;
 update public.submissions set score=p_score,feedback=coalesce(p_feedback,''),reviewed_at=now()
 where assignment_id=a.id and student_id=a.student_id;
 if not found then raise exception 'submission_not_found'; end if;
end $$;

revoke all on public.submissions from authenticated;
grant select on public.submissions to authenticated;
grant execute on function public.submit_assignment(uuid,text) to authenticated;
grant execute on function public.review_assignment(uuid,numeric,text) to authenticated;

create index if not exists assignments_teacher_created_idx on public.assignments(teacher_id,created_at desc);
create index if not exists assignments_student_due_idx on public.assignments(student_id,due_at);
create index if not exists submissions_student_idx on public.submissions(student_id,submitted_at desc);
grant select,insert,update,delete on public.assignments to authenticated;
