-- OnlineRepetitor v43: reliable schedule -> live lesson flow
alter table public.live_lessons add column if not exists schedule_id uuid references public.scheduled_lessons(id) on delete set null;
create index if not exists live_lessons_schedule_idx on public.live_lessons(schedule_id);

create or replace function public.list_schedule()
returns table(id uuid,teacher_id uuid,student_id uuid,student_name text,board_id uuid,board_title text,title text,starts_at timestamptz,duration_minutes integer,recurrence text,recurrence_group_id uuid,note text,status text,created_at timestamptz)
language sql security definer set search_path=public stable as $$
 select s.id,s.teacher_id,s.student_id,coalesce(p.name,'Ученик'),s.board_id,coalesce(b.title,'Без доски'),s.title,s.starts_at,s.duration_minutes,s.recurrence,s.recurrence_group_id,s.note,s.status,s.created_at
 from public.scheduled_lessons s
 left join public.profiles p on p.id=s.student_id
 left join public.boards b on b.id=s.board_id
 where s.teacher_id=auth.uid() or s.student_id=auth.uid()
 order by s.starts_at asc
$$;
grant execute on function public.list_schedule() to authenticated;

create or replace function public.start_scheduled_lesson(p_schedule_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.scheduled_lessons where id=p_schedule_id and teacher_id=auth.uid()) then raise exception 'schedule_not_available'; end if;
 update public.scheduled_lessons set status='planned' where id=p_schedule_id;
end $$;
grant execute on function public.start_scheduled_lesson(uuid) to authenticated;

create or replace function public.complete_scheduled_lesson(p_schedule_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.scheduled_lessons where id=p_schedule_id and teacher_id=auth.uid()) then raise exception 'schedule_not_available'; end if;
 update public.scheduled_lessons set status='completed' where id=p_schedule_id;
end $$;
grant execute on function public.complete_scheduled_lesson(uuid) to authenticated;
