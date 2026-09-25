-- OnlineRepetitor v124: message editing/deletion and read receipts.
alter table public.direct_chat_messages add column if not exists edited_at timestamptz;
alter table public.direct_chat_messages add column if not exists deleted_at timestamptz;

drop policy if exists direct_chat_messages_update on public.direct_chat_messages;
create policy direct_chat_messages_update on public.direct_chat_messages
for update to authenticated
using(sender_id=auth.uid() and public.is_direct_chat_member(conversation_id))
with check(sender_id=auth.uid() and public.is_direct_chat_member(conversation_id));
grant update(body,edited_at,deleted_at) on public.direct_chat_messages to authenticated;

create or replace function public.get_direct_chat_read_state(p_conversation_id uuid)
returns table(other_last_read_at timestamptz)
language sql security definer set search_path=public as $$
 select m.last_read_at
 from public.direct_chat_members m
 where m.conversation_id=p_conversation_id
   and m.user_id<>auth.uid()
   and public.is_direct_chat_member(p_conversation_id)
 limit 1;
$$;
grant execute on function public.get_direct_chat_read_state(uuid) to authenticated;

-- Realtime already contains direct_chat_members/messages after v123. Keep migration idempotent.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_chat_messages') then alter publication supabase_realtime add table public.direct_chat_messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_chat_members') then alter publication supabase_realtime add table public.direct_chat_members; end if;
end $$;
