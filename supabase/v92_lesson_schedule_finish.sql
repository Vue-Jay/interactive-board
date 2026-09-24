-- OnlineRepetitor v92: finish schedule -> live lesson lifecycle.
begin;

create or replace function public.start_scheduled_lesson(p_schedule_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if not exists(select 1 from public.scheduled_lessons where id=p_schedule_id and teacher_id=auth.uid()) then
  raise exception 'schedule_not_available';
 end if;
 update public.scheduled_lessons
 set status='planned'
 where id=p_schedule_id and teacher_id=auth.uid();
end $$;
revoke all on function public.start_scheduled_lesson(uuid) from public,anon;
grant execute on function public.start_scheduled_lesson(uuid) to authenticated;

create or replace function public.complete_scheduled_lesson(p_schedule_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if not exists(select 1 from public.scheduled_lessons where id=p_schedule_id and teacher_id=auth.uid()) then
  raise exception 'schedule_not_available';
 end if;
 update public.scheduled_lessons
 set status='completed'
 where id=p_schedule_id and teacher_id=auth.uid();
end $$;
revoke all on function public.complete_scheduled_lesson(uuid) from public,anon;
grant execute on function public.complete_scheduled_lesson(uuid) to authenticated;

create index if not exists scheduled_lessons_status_time_idx
 on public.scheduled_lessons(status,starts_at);

commit;
