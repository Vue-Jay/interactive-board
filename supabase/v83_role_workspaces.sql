-- OnlineRepetitor v83 — enforce approved-teacher actions in assignments and schedule.
-- Run after v82.
begin;

-- Review can only be performed by an approved teacher/admin.
create or replace function public.review_assignment(p_assignment_id uuid,p_score numeric,p_feedback text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.assignments;
begin
 if not public.is_approved_teacher(auth.uid()) then raise exception 'Требуется одобренная роль преподавателя' using errcode='42501'; end if;
 select * into a from public.assignments where id=p_assignment_id and teacher_id=auth.uid();
 if a.id is null then raise exception 'assignment_not_available'; end if;
 if p_score is not null and (p_score<0 or p_score>a.max_score) then raise exception 'invalid_score'; end if;
 update public.submissions set score=p_score,feedback=coalesce(p_feedback,''),reviewed_at=now()
 where assignment_id=a.id and student_id=a.student_id;
 if not found then raise exception 'submission_not_found'; end if;
end $$;

-- Schedule writes require approved teacher status.
drop policy if exists "schedule teacher insert" on public.scheduled_lessons;
drop policy if exists "schedule teacher update" on public.scheduled_lessons;
drop policy if exists "schedule teacher delete" on public.scheduled_lessons;
create policy "schedule teacher insert" on public.scheduled_lessons for insert to authenticated
with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "schedule teacher update" on public.scheduled_lessons for update to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "schedule teacher delete" on public.scheduled_lessons for delete to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));

commit;
