-- OnlineRepetitor v125 · WebRTC signalling for direct video calls
create table if not exists public.direct_call_signals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_chat_conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','candidate','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists direct_call_signals_receiver_created_idx on public.direct_call_signals(receiver_id,created_at desc);
create index if not exists direct_call_signals_conversation_created_idx on public.direct_call_signals(conversation_id,created_at desc);
alter table public.direct_call_signals enable row level security;
grant select,insert on public.direct_call_signals to authenticated;

drop policy if exists "call signals read by participants" on public.direct_call_signals;
create policy "call signals read by participants" on public.direct_call_signals for select to authenticated using (
  exists(select 1 from public.direct_chat_members m where m.conversation_id=direct_call_signals.conversation_id and m.user_id=auth.uid())
);
drop policy if exists "call signals insert by participants" on public.direct_call_signals;
create policy "call signals insert by participants" on public.direct_call_signals for insert to authenticated with check (
  sender_id=auth.uid()
  and receiver_id<>auth.uid()
  and exists(select 1 from public.direct_chat_members me where me.conversation_id=direct_call_signals.conversation_id and me.user_id=auth.uid())
  and exists(select 1 from public.direct_chat_members other_member where other_member.conversation_id=direct_call_signals.conversation_id and other_member.user_id=receiver_id)
);

do $$ begin
  alter publication supabase_realtime add table public.direct_call_signals;
exception when duplicate_object then null;
end $$;

-- Keep transient signalling data small.
create or replace function public.cleanup_old_direct_call_signals()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  delete from public.direct_call_signals where created_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cleanup_old_direct_call_signals() from public;
