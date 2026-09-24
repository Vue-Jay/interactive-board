-- OnlineRepetitor v84 — finish server enforcement for teacher/student roles.
-- Run after v82 and v83.
begin;

-- Student records: teacher writes, student can only read own lesson history.
drop policy if exists "teacher owns student profiles" on public.student_profiles;
drop policy if exists "teacher owns student sessions" on public.student_sessions;
drop policy if exists "student reads own sessions" on public.student_sessions;

create policy "teacher owns student profiles" on public.student_profiles
for all to authenticated
using (teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check (
 teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())
 and exists(
   select 1 from public.boards b join public.board_members bm on bm.board_id=b.id
   where b.owner_id=auth.uid() and bm.user_id=student_profiles.student_id
 )
);

create policy "teacher owns student sessions" on public.student_sessions
for all to authenticated
using (teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check (
 teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())
 and exists(
   select 1 from public.boards b join public.board_members bm on bm.board_id=b.id
   where b.owner_id=auth.uid() and bm.user_id=student_sessions.student_id
 )
 and (board_id is null or exists(
   select 1 from public.boards b where b.id=student_sessions.board_id and b.owner_id=auth.uid()
 ))
);

create policy "student reads own sessions" on public.student_sessions
for select to authenticated using(student_id=auth.uid());

-- Assignment writes are teacher-only. Reads remain participant-scoped.
drop policy if exists "assignment teacher insert" on public.assignments;
drop policy if exists "assignment teacher update" on public.assignments;
drop policy if exists "assignment teacher delete" on public.assignments;

create policy "assignment teacher insert" on public.assignments for insert to authenticated with check (
 teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())
 and exists(
   select 1 from public.boards b join public.board_members bm on bm.board_id=b.id
   where b.owner_id=auth.uid() and bm.user_id=assignments.student_id
   and (assignments.board_id is null or b.id=assignments.board_id)
 )
);
create policy "assignment teacher update" on public.assignments for update to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "assignment teacher delete" on public.assignments for delete to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));

-- Student can submit only their own assignment.
create or replace function public.submit_assignment(p_assignment_id uuid,p_content text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.assignments;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into a from public.assignments where id=p_assignment_id and student_id=auth.uid();
 if a.id is null then raise exception 'assignment_not_available'; end if;
 insert into public.submissions(assignment_id,student_id,content,submitted_at,score,feedback,reviewed_at)
 values(a.id,auth.uid(),coalesce(p_content,''),now(),null,'',null)
 on conflict(assignment_id,student_id) do update
 set content=excluded.content,submitted_at=now(),score=null,feedback='',reviewed_at=null;
end $$;

-- Teacher review remains approved-teacher only.
create or replace function public.review_assignment(p_assignment_id uuid,p_score numeric,p_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.assignments;
begin
 if not public.is_approved_teacher(auth.uid()) then
   raise exception 'Требуется одобренная роль преподавателя' using errcode='42501';
 end if;
 select * into a from public.assignments where id=p_assignment_id and teacher_id=auth.uid();
 if a.id is null then raise exception 'assignment_not_available'; end if;
 if p_score is not null and (p_score<0 or p_score>a.max_score) then raise exception 'invalid_score'; end if;
 update public.submissions set score=p_score,feedback=coalesce(p_feedback,''),reviewed_at=now()
 where assignment_id=a.id and student_id=a.student_id;
 if not found then raise exception 'submission_not_found'; end if;
end $$;

revoke all on function public.submit_assignment(uuid,text) from public,anon;
revoke all on function public.review_assignment(uuid,numeric,text) from public,anon;
grant execute on function public.submit_assignment(uuid,text) to authenticated;
grant execute on function public.review_assignment(uuid,numeric,text) to authenticated;

-- Schedule: approved teacher writes, participants read.
drop policy if exists "schedule teacher insert" on public.scheduled_lessons;
drop policy if exists "schedule teacher update" on public.scheduled_lessons;
drop policy if exists "schedule teacher delete" on public.scheduled_lessons;

create policy "schedule teacher insert" on public.scheduled_lessons for insert to authenticated with check (
 teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())
 and exists(
   select 1 from public.boards b join public.board_members bm on bm.board_id=b.id
   where b.owner_id=auth.uid() and bm.user_id=scheduled_lessons.student_id
   and (scheduled_lessons.board_id is null or b.id=scheduled_lessons.board_id)
 )
);
create policy "schedule teacher update" on public.scheduled_lessons for update to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "schedule teacher delete" on public.scheduled_lessons for delete to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));

commit;
