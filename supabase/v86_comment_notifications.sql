-- OnlineRepetitor v86: replies and @mentions from board discussions appear in notifications.
begin;

alter table public.notification_settings
  add column if not exists comment boolean not null default true;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check(kind in('assignment','submission','review','lesson','material','comment'));

create or replace function public.notification_enabled(p_user uuid,p_kind text)
returns boolean language sql security definer set search_path=public stable as $$
 select coalesce((select case p_kind
  when 'assignment' then assignment when 'submission' then submission when 'review' then review
  when 'lesson' then lesson when 'material' then material when 'comment' then comment else true end
 from public.notification_settings where user_id=p_user),true) $$;
revoke all on function public.notification_enabled(uuid,text) from public,anon,authenticated;

create or replace function public.save_my_notification_settings(
 p_assignment boolean,p_submission boolean,p_review boolean,p_lesson boolean,p_material boolean,
 p_comment boolean,p_lesson_reminder boolean,p_assignment_reminder boolean
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 insert into public.notification_settings(user_id,assignment,submission,review,lesson,material,comment,lesson_reminder,assignment_reminder,updated_at)
 values(auth.uid(),p_assignment,p_submission,p_review,p_lesson,p_material,p_comment,p_lesson_reminder,p_assignment_reminder,now())
 on conflict(user_id) do update set assignment=excluded.assignment,submission=excluded.submission,review=excluded.review,
 lesson=excluded.lesson,material=excluded.material,comment=excluded.comment,lesson_reminder=excluded.lesson_reminder,
 assignment_reminder=excluded.assignment_reminder,updated_at=now();
end $$;
revoke all on function public.save_my_notification_settings(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.save_my_notification_settings(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.notify_board_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare
 v_board_title text;
 v_parent_author uuid;
 r record;
begin
 select title into v_board_title from public.boards where id=new.board_id;

 -- A direct reply notifies the author of the parent comment.
 if new.parent_id is not null then
  select author_id into v_parent_author from public.board_comments where id=new.parent_id;
  if v_parent_author is not null and v_parent_author<>new.author_id and public.notification_enabled(v_parent_author,'comment') then
   insert into public.notifications(user_id,kind,title,body,href)
   values(v_parent_author,'comment','Новый ответ в обсуждении',coalesce(v_board_title,'Доска')||' · '||left(new.body,180),'/board/'||new.board_id::text);
  end if;
 end if;

 -- @Display name mentions notify accessible board participants. A reply recipient is not duplicated.
 for r in
  select distinct p.id,p.display_name
  from public.profiles p
  where p.id<>new.author_id
    and nullif(trim(p.display_name),'') is not null
    and position(lower('@'||trim(p.display_name)) in lower(new.body))>0
    and (exists(select 1 from public.boards b where b.id=new.board_id and b.owner_id=p.id)
      or exists(select 1 from public.board_members bm where bm.board_id=new.board_id and bm.user_id=p.id))
 loop
  if (v_parent_author is null or r.id<>v_parent_author) and public.notification_enabled(r.id,'comment') then
   insert into public.notifications(user_id,kind,title,body,href)
   values(r.id,'comment','Вас упомянули в обсуждении',coalesce(v_board_title,'Доска')||' · '||left(new.body,180),'/board/'||new.board_id::text);
  end if;
 end loop;
 return new;
end $$;

revoke all on function public.notify_board_comment() from public,anon,authenticated;
drop trigger if exists trg_notify_board_comment on public.board_comments;
create trigger trg_notify_board_comment after insert on public.board_comments
for each row execute function public.notify_board_comment();

commit;
