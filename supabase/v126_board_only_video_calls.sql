-- OnlineRepetitor v126 · video calls are scoped to an open board only
create table if not exists public.board_call_signals (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','candidate','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists board_call_signals_receiver_created_idx on public.board_call_signals(receiver_id,created_at desc);
create index if not exists board_call_signals_board_created_idx on public.board_call_signals(board_id,created_at desc);
alter table public.board_call_signals enable row level security;
grant select,insert on public.board_call_signals to authenticated;

drop policy if exists "board call signals read by board participants" on public.board_call_signals;
create policy "board call signals read by board participants" on public.board_call_signals for select to authenticated using (
  receiver_id=auth.uid() and public.can_access_board(board_id)
);
drop policy if exists "board call signals insert by board participants" on public.board_call_signals;
create policy "board call signals insert by board participants" on public.board_call_signals for insert to authenticated with check (
  sender_id=auth.uid() and receiver_id<>auth.uid() and public.can_access_board(board_id)
  and (
    exists(select 1 from public.boards b where b.id=board_id and b.owner_id=receiver_id)
    or exists(select 1 from public.board_members m where m.board_id=board_call_signals.board_id and m.user_id=receiver_id)
  )
);

do $$ begin
  alter publication supabase_realtime add table public.board_call_signals;
exception when duplicate_object then null;
end $$;

-- v125 direct-chat calling is deliberately retired: calls now exist only in boards.
do $$ begin
  if to_regclass('public.direct_call_signals') is not null then
    execute 'drop table public.direct_call_signals cascade';
  end if;
end $$;

create or replace function public.cleanup_old_board_call_signals()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  delete from public.board_call_signals where created_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cleanup_old_board_call_signals() from public;
