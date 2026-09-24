create table if not exists public.notification_settings(
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 assignment boolean not null default true, submission boolean not null default true, review boolean not null default true,
 lesson boolean not null default true, material boolean not null default true,
 lesson_reminder boolean not null default true, assignment_reminder boolean not null default true, updated_at timestamptz not null default now());
alter table public.notification_settings enable row level security;
drop policy if exists "notification settings own" on public.notification_settings;
create policy "notification settings own" on public.notification_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.notification_settings to authenticated;
create or replace function public.notification_enabled(p_user uuid,p_kind text) returns boolean language sql security definer set search_path=public stable as $$
 select coalesce((select case p_kind when 'assignment' then assignment when 'submission' then submission when 'review' then review when 'lesson' then lesson when 'material' then material else true end from public.notification_settings where user_id=p_user),true) $$;
revoke all on function public.notification_enabled(uuid,text) from public,anon; grant execute on function public.notification_enabled(uuid,text) to authenticated;
create or replace function public.notify_assignment_created() returns trigger language plpgsql security definer set search_path=public as $$
begin if public.notification_enabled(new.student_id,'assignment') then insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'assignment','Новое задание',new.title,'/?section=assignments');end if;return new;end $$;
create or replace function public.notify_submission_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare a public.assignments%rowtype;begin select * into a from public.assignments where id=new.assignment_id;
if new.reviewed_at is not null and old.reviewed_at is distinct from new.reviewed_at and public.notification_enabled(a.student_id,'review') then insert into public.notifications(user_id,kind,title,body,href) values(a.student_id,'review','Работа проверена',a.title,'/?section=assignments');
elsif new.submitted_at is not null and old.submitted_at is distinct from new.submitted_at and public.notification_enabled(a.teacher_id,'submission') then insert into public.notifications(user_id,kind,title,body,href) values(a.teacher_id,'submission','Ученик сдал работу',a.title,'/?section=assignments');end if;return new;end $$;
create or replace function public.notify_material_linked() returns trigger language plpgsql security definer set search_path=public as $$
declare t text;begin if public.notification_enabled(new.student_id,'material') then select title into t from public.materials where id=new.material_id;insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'material','Новый материал',coalesce(t,'Материал'),'/?section=assignments');end if;return new;end $$;
create or replace function public.notify_lesson_planned() returns trigger language plpgsql security definer set search_path=public as $$
begin if public.notification_enabled(new.student_id,'lesson') then insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'lesson','Запланировано занятие',new.title,'/?section=schedule');end if;return new;end $$;
create or replace function public.generate_due_notifications() returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0;begin
insert into public.notifications(user_id,kind,title,body,href)
select s.student_id,'lesson','Занятие скоро начнётся',s.title||' · через несколько часов','/?section=schedule'
from public.scheduled_lessons s left join public.notification_settings ns on ns.user_id=s.student_id
where s.status='planned' and s.starts_at between now()+interval '2 hours' and now()+interval '4 hours' and coalesce(ns.lesson_reminder,true)
and not exists(select 1 from public.notifications x where x.user_id=s.student_id and x.title='Занятие скоро начнётся' and x.body like s.title||'%' and x.created_at>now()-interval '12 hours');
get diagnostics n=row_count;
insert into public.notifications(user_id,kind,title,body,href)
select a.student_id,'assignment','Срок задания приближается',a.title||' · срок менее суток','/?section=assignments'
from public.assignments a left join public.notification_settings ns on ns.user_id=a.student_id
where a.status='assigned' and a.due_at between now() and now()+interval '24 hours' and coalesce(ns.assignment_reminder,true)
and not exists(select 1 from public.notifications x where x.user_id=a.student_id and x.title='Срок задания приближается' and x.body like a.title||'%' and x.created_at>now()-interval '24 hours');
return n;end $$;
revoke all on function public.generate_due_notifications() from public,anon; grant execute on function public.generate_due_notifications() to authenticated;
