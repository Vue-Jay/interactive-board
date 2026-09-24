create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('assignment','submission','review','lesson','material')),
 title text not null, body text not null default '', href text not null default '',
 created_at timestamptz not null default now(), read_at timestamptz
);
alter table public.notifications enable row level security;
drop policy if exists "notifications own read" on public.notifications;
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own read" on public.notifications for select to authenticated using(user_id=auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,update on public.notifications to authenticated;
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);

create or replace function public.mark_all_notifications_read() returns void language sql security definer set search_path=public as $$
 update public.notifications set read_at=coalesce(read_at,now()) where user_id=auth.uid() and read_at is null $$;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.notify_assignment_created() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'assignment','Новое задание',new.title,'/?section=assignments');return new;end $$;
drop trigger if exists trg_notify_assignment on public.assignments;
create trigger trg_notify_assignment after insert on public.assignments for each row execute function public.notify_assignment_created();

create or replace function public.notify_submission_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare a public.assignments%rowtype;
begin select * into a from public.assignments where id=new.assignment_id;
 if new.reviewed_at is not null and (old.reviewed_at is distinct from new.reviewed_at) then
  insert into public.notifications(user_id,kind,title,body,href) values(a.student_id,'review','Работа проверена',a.title,'/?section=assignments');
 elsif new.submitted_at is not null and (old.submitted_at is distinct from new.submitted_at) then
  insert into public.notifications(user_id,kind,title,body,href) values(a.teacher_id,'submission','Ученик сдал работу',a.title,'/?section=assignments');
 end if; return new;end $$;
drop trigger if exists trg_notify_submission on public.submissions;
create trigger trg_notify_submission after update on public.submissions for each row execute function public.notify_submission_changed();

create or replace function public.notify_material_linked() returns trigger language plpgsql security definer set search_path=public as $$
declare t text;
begin select title into t from public.materials where id=new.material_id;
 insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'material','Новый материал',coalesce(t,'Материал'),'/?section=assignments');return new;end $$;
drop trigger if exists trg_notify_material on public.material_links;
create trigger trg_notify_material after insert on public.material_links for each row execute function public.notify_material_linked();

create or replace function public.notify_lesson_planned() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.notifications(user_id,kind,title,body,href) values(new.student_id,'lesson','Запланировано занятие',new.title,'/?section=schedule');return new;end $$;
drop trigger if exists trg_notify_lesson on public.scheduled_lessons;
create trigger trg_notify_lesson after insert on public.scheduled_lessons for each row execute function public.notify_lesson_planned();
