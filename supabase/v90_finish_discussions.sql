-- OnlineRepetitor v90: finish board discussions and @mentions.
begin;

create or replace function public.list_board_comment_participants(p_board_id uuid)
returns table(user_id uuid,display_name text)
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_access_board(p_board_id) then
  raise exception 'Недостаточно прав';
 end if;
 return query
 select x.user_id,coalesce(nullif(trim(p.display_name),''),'Участник')
 from (
  select b.owner_id as user_id from public.boards b where b.id=p_board_id
  union
  select bm.user_id from public.board_members bm where bm.board_id=p_board_id
 ) x
 join public.profiles p on p.id=x.user_id
 order by lower(coalesce(nullif(trim(p.display_name),''),'Участник'));
end $$;
revoke all on function public.list_board_comment_participants(uuid) from public,anon;
grant execute on function public.list_board_comment_participants(uuid) to authenticated;

create or replace function public.notify_board_comment()
returns trigger language plpgsql security definer set search_path=public as $$
declare
 v_board_title text;
 v_parent_author uuid;
 v_parent_id uuid;
 r record;
 v_pattern text;
begin
 select title into v_board_title from public.boards where id=new.board_id;
 v_parent_id:=new.parent_id;

 if new.parent_id is not null then
  select author_id into v_parent_author from public.board_comments where id=new.parent_id and board_id=new.board_id;
  if v_parent_author is not null and v_parent_author<>new.author_id and public.notification_enabled(v_parent_author,'comment') then
   insert into public.notifications(user_id,kind,title,body,href)
   values(v_parent_author,'comment','Новый ответ в обсуждении',coalesce(v_board_title,'Доска')||' · '||left(new.body,180),'/board/'||new.board_id::text||'?discussion='||new.id::text);
  end if;
 end if;

 for r in
  select distinct p.id,p.display_name
  from public.profiles p
  where p.id<>new.author_id
    and nullif(trim(p.display_name),'') is not null
    and (exists(select 1 from public.boards b where b.id=new.board_id and b.owner_id=p.id)
      or exists(select 1 from public.board_members bm where bm.board_id=new.board_id and bm.user_id=p.id))
 loop
  -- Escape regexp metacharacters in display names and require mention boundaries,
  -- so @Анна does not accidentally notify @Анна Мария or another prefix match.
  v_pattern:='(^|[[:space:]])@'||regexp_replace(trim(r.display_name),'([\\.\\^\\$\\|\\(\\)\\[\\]\\{\\}\\*\\+\\?\\\\-])','\\\\\\1','g')||'([[:space:][:punct:]]|$)';
  if new.body ~* v_pattern
     and (v_parent_author is null or r.id<>v_parent_author)
     and public.notification_enabled(r.id,'comment') then
   insert into public.notifications(user_id,kind,title,body,href)
   values(r.id,'comment','Вас упомянули в обсуждении',coalesce(v_board_title,'Доска')||' · '||left(new.body,180),'/board/'||new.board_id::text||'?discussion='||new.id::text);
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.notify_board_comment() from public,anon,authenticated;
drop trigger if exists trg_notify_board_comment on public.board_comments;
create trigger trg_notify_board_comment after insert on public.board_comments
for each row execute function public.notify_board_comment();

-- Realtime is idempotently enabled here as well, so v90 is self-contained for this feature.
do $$ begin
 if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
  create publication supabase_realtime;
 end if;
 if not exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime' and schemaname='public' and tablename='board_comments'
 ) then
  alter publication supabase_realtime add table public.board_comments;
 end if;
end $$;

commit;
