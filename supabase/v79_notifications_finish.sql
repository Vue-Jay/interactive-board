-- OnlineRepetitor v79
-- Secure notification preferences + server-side reminder schedule.

create or replace function public.save_my_notification_settings(
  p_assignment boolean,
  p_submission boolean,
  p_review boolean,
  p_lesson boolean,
  p_material boolean,
  p_lesson_reminder boolean,
  p_assignment_reminder boolean
) returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
  insert into public.notification_settings(
    user_id,assignment,submission,review,lesson,material,lesson_reminder,assignment_reminder,updated_at
  ) values(
    auth.uid(),p_assignment,p_submission,p_review,p_lesson,p_material,p_lesson_reminder,p_assignment_reminder,now()
  )
  on conflict(user_id) do update set
    assignment=excluded.assignment,
    submission=excluded.submission,
    review=excluded.review,
    lesson=excluded.lesson,
    material=excluded.material,
    lesson_reminder=excluded.lesson_reminder,
    assignment_reminder=excluded.assignment_reminder,
    updated_at=now();
end $$;

revoke all on function public.save_my_notification_settings(boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.save_my_notification_settings(boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

-- Internal helper. Trigger functions can still call it as SECURITY DEFINER.
revoke all on function public.notification_enabled(uuid,text) from public,anon,authenticated;

-- Reminder generator must never be callable by ordinary authenticated clients.
revoke all on function public.generate_due_notifications() from public,anon,authenticated;

-- Harden mark-all RPC explicitly.
revoke all on function public.mark_all_notifications_read() from public,anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Run reminder generation inside Postgres. No service-role key is exposed to the browser.
create extension if not exists pg_cron with schema extensions;

do $$
declare job_id bigint;
begin
  select jobid into job_id from cron.job where jobname='onlinerepetitor-due-notifications' limit 1;
  if job_id is not null then perform cron.unschedule(job_id); end if;
  perform cron.schedule(
    'onlinerepetitor-due-notifications',
    '*/15 * * * *',
    'select public.generate_due_notifications();'
  );
end $$;
