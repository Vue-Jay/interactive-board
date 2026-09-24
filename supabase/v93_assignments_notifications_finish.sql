-- OnlineRepetitor v93: assignments, homework and notifications finish.
begin;

create or replace function public.notify_assignment_created()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if public.notification_enabled(new.student_id,'assignment') then
  insert into public.notifications(user_id,kind,title,body,href)
  values(new.student_id,'assignment','Новое задание',new.title,'/?section=assignments&assignment='||new.id::text);
 end if;
 return new;
end $$;

create or replace function public.notify_submission_changed()
returns trigger language plpgsql security definer set search_path=public as $$
declare a public.assignments%rowtype;
begin
 select * into a from public.assignments where id=new.assignment_id;
 if new.reviewed_at is not null and (tg_op='INSERT' or old.reviewed_at is distinct from new.reviewed_at)
    and public.notification_enabled(a.student_id,'review') then
  insert into public.notifications(user_id,kind,title,body,href)
  values(a.student_id,'review','Работа проверена',a.title,'/?section=assignments&assignment='||a.id::text);
 elsif new.submitted_at is not null and (tg_op='INSERT' or old.submitted_at is distinct from new.submitted_at)
    and public.notification_enabled(a.teacher_id,'submission') then
  insert into public.notifications(user_id,kind,title,body,href)
  values(a.teacher_id,'submission','Ученик сдал работу',a.title,'/?section=assignments&assignment='||a.id::text);
 end if;
 return new;
end $$;

drop trigger if exists trg_notify_submission on public.submissions;
create trigger trg_notify_submission after insert or update on public.submissions
for each row execute function public.notify_submission_changed();

create or replace function public.generate_due_notifications()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0; m integer:=0;
begin
 insert into public.notifications(user_id,kind,title,body,href)
 select s.student_id,'lesson','Занятие скоро начнётся',s.title||' · через несколько часов','/?section=schedule'
 from public.scheduled_lessons s left join public.notification_settings ns on ns.user_id=s.student_id
 where s.status='planned' and s.starts_at between now()+interval '2 hours' and now()+interval '4 hours'
   and coalesce(ns.lesson_reminder,true)
   and not exists(select 1 from public.notifications x where x.user_id=s.student_id and x.title='Занятие скоро начнётся' and x.body like s.title||'%' and x.created_at>now()-interval '12 hours');
 get diagnostics n=row_count;

 insert into public.notifications(user_id,kind,title,body,href)
 select a.student_id,'assignment','Срок задания приближается',a.title||' · срок менее суток','/?section=assignments&assignment='||a.id::text
 from public.assignments a
 left join public.submissions sub on sub.assignment_id=a.id and sub.student_id=a.student_id
 left join public.notification_settings ns on ns.user_id=a.student_id
 where sub.assignment_id is null
   and a.due_at between now() and now()+interval '24 hours'
   and coalesce(ns.assignment_reminder,true)
   and not exists(select 1 from public.notifications x where x.user_id=a.student_id and x.title='Срок задания приближается' and x.href like '%assignment='||a.id::text and x.created_at>now()-interval '24 hours');
 get diagnostics m=row_count;
 return n+m;
end $$;

revoke all on function public.notify_assignment_created() from public,anon,authenticated;
revoke all on function public.notify_submission_changed() from public,anon,authenticated;
revoke all on function public.generate_due_notifications() from public,anon,authenticated;

create index if not exists assignments_due_open_idx on public.assignments(due_at,student_id) where due_at is not null;
create index if not exists notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null;

commit;
