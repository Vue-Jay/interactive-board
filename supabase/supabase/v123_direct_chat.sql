-- OnlineRepetitor v123: persistent direct teacher/student chat.
create table if not exists public.direct_chat_conversations(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.direct_chat_members(
  conversation_id uuid not null references public.direct_chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.direct_chat_messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_chat_conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_name text not null default '',
  body text not null check(char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists direct_chat_members_user_idx on public.direct_chat_members(user_id,conversation_id);
create index if not exists direct_chat_messages_conversation_idx on public.direct_chat_messages(conversation_id,created_at);
alter table public.direct_chat_conversations enable row level security;
alter table public.direct_chat_members enable row level security;
alter table public.direct_chat_messages enable row level security;

create or replace function public.is_direct_chat_member(p_conversation_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.direct_chat_members m where m.conversation_id=p_conversation_id and m.user_id=auth.uid());
$$;
grant execute on function public.is_direct_chat_member(uuid) to authenticated;

drop policy if exists direct_chat_conversations_select on public.direct_chat_conversations;
create policy direct_chat_conversations_select on public.direct_chat_conversations for select to authenticated using(
 public.is_direct_chat_member(id)
);
drop policy if exists direct_chat_members_select on public.direct_chat_members;
create policy direct_chat_members_select on public.direct_chat_members for select to authenticated using(
 public.is_direct_chat_member(conversation_id)
);
drop policy if exists direct_chat_messages_select on public.direct_chat_messages;
create policy direct_chat_messages_select on public.direct_chat_messages for select to authenticated using(
 public.is_direct_chat_member(direct_chat_messages.conversation_id)
);
drop policy if exists direct_chat_messages_insert on public.direct_chat_messages;
create policy direct_chat_messages_insert on public.direct_chat_messages for insert to authenticated with check(
 sender_id=auth.uid() and public.is_direct_chat_member(direct_chat_messages.conversation_id)
);

grant select on public.direct_chat_conversations,public.direct_chat_members,public.direct_chat_messages to authenticated;
grant insert on public.direct_chat_messages to authenticated;

create or replace function public.direct_chat_set_sender_name() returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.sender_id:=auth.uid();
 select coalesce(nullif(display_name,''),'Участник') into new.sender_name from public.profiles where id=auth.uid();
 if new.sender_name is null then new.sender_name:='Участник'; end if;
 update public.direct_chat_conversations set updated_at=now() where id=new.conversation_id;
 return new;
end $$;
drop trigger if exists trg_direct_chat_sender on public.direct_chat_messages;
create trigger trg_direct_chat_sender before insert on public.direct_chat_messages for each row execute function public.direct_chat_set_sender_name();

create or replace function public.ensure_direct_chat(p_other_user_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null or p_other_user_id is null or p_other_user_id=auth.uid() then raise exception 'Недопустимый участник'; end if;
 -- Direct chat is allowed only between users who share at least one active board.
 if not exists(
   select 1 from public.board_members a join public.board_members b on b.board_id=a.board_id
   where a.user_id=auth.uid() and b.user_id=p_other_user_id
 ) and not exists(
   select 1 from public.boards b join public.board_members m on m.board_id=b.id
   where (b.owner_id=auth.uid() and m.user_id=p_other_user_id) or (b.owner_id=p_other_user_id and m.user_id=auth.uid())
 ) then raise exception 'Диалог доступен только участникам общей доски'; end if;
 select c.id into v_id from public.direct_chat_conversations c
 where (select count(*) from public.direct_chat_members m where m.conversation_id=c.id)=2
 and exists(select 1 from public.direct_chat_members m where m.conversation_id=c.id and m.user_id=auth.uid())
 and exists(select 1 from public.direct_chat_members m where m.conversation_id=c.id and m.user_id=p_other_user_id)
 limit 1;
 if v_id is null then
   insert into public.direct_chat_conversations default values returning id into v_id;
   insert into public.direct_chat_members(conversation_id,user_id) values(v_id,auth.uid()),(v_id,p_other_user_id);
 end if;
 return v_id;
end $$;

create or replace function public.list_direct_chat_contacts() returns table(user_id uuid,display_name text,email text) language sql security definer set search_path=public as $$
 with ids as (
  select m.user_id from public.boards b join public.board_members m on m.board_id=b.id where b.owner_id=auth.uid() and m.user_id<>auth.uid()
  union
  select b.owner_id from public.boards b join public.board_members m on m.board_id=b.id where m.user_id=auth.uid() and b.owner_id<>auth.uid()
  union
  select b.user_id from public.board_members a join public.board_members b on b.board_id=a.board_id where a.user_id=auth.uid() and b.user_id<>auth.uid()
 ) select p.id,coalesce(nullif(p.display_name,''),'Участник'),p.email from ids join public.profiles p on p.id=ids.user_id order by 2;
$$;

create or replace function public.list_direct_chats() returns table(id uuid,other_user_id uuid,other_name text,other_email text,last_message text,last_message_at timestamptz,unread_count bigint) language sql security definer set search_path=public as $$
 select c.id,other.user_id,coalesce(nullif(p.display_name,''),'Участник'),p.email,
   lm.body,lm.created_at,
   (select count(*) from public.direct_chat_messages um where um.conversation_id=c.id and um.sender_id<>auth.uid() and um.created_at>me.last_read_at)
 from public.direct_chat_conversations c
 join public.direct_chat_members me on me.conversation_id=c.id and me.user_id=auth.uid()
 join public.direct_chat_members other on other.conversation_id=c.id and other.user_id<>auth.uid()
 left join public.profiles p on p.id=other.user_id
 left join lateral(select body,created_at from public.direct_chat_messages x where x.conversation_id=c.id order by created_at desc limit 1) lm on true
 order by coalesce(lm.created_at,c.updated_at) desc;
$$;

create or replace function public.mark_direct_chat_read(p_conversation_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update public.direct_chat_members set last_read_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
 if not found then raise exception 'Нет доступа к диалогу'; end if;
end $$;

grant execute on function public.ensure_direct_chat(uuid),public.list_direct_chat_contacts(),public.list_direct_chats(),public.mark_direct_chat_read(uuid) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_chat_messages') then alter publication supabase_realtime add table public.direct_chat_messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_chat_members') then alter publication supabase_realtime add table public.direct_chat_members; end if;
end $$;
