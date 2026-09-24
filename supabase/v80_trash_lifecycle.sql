-- OnlineRepetitor v80
-- Automatic 30-day trash lifecycle with Storage-safe queue.

begin;

create table if not exists public.board_purge_queue(
  board_id uuid primary key references public.boards(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  queued_at timestamptz not null default now(),
  asset_count integer not null default 0 check(asset_count>=0),
  last_checked_at timestamptz not null default now()
);
alter table public.board_purge_queue enable row level security;
drop policy if exists "purge queue own read" on public.board_purge_queue;
create policy "purge queue own read" on public.board_purge_queue for select to authenticated using(owner_id=auth.uid());
grant select on public.board_purge_queue to authenticated;

create or replace function public.queue_expired_trashed_boards()
returns integer
language plpgsql
security definer
set search_path=public,storage
as $$
declare n integer:=0;
begin
  insert into public.board_purge_queue(board_id,owner_id,asset_count,last_checked_at)
  select b.id,b.owner_id,
         (select count(*)::integer from storage.objects o where o.bucket_id='board-assets' and o.name like b.id::text||'/%'),
         now()
  from public.boards b
  where b.deleted_at is not null and b.deleted_at<=now()-interval '30 days'
  on conflict(board_id) do update set
    owner_id=excluded.owner_id,
    asset_count=excluded.asset_count,
    last_checked_at=now();
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.finish_queued_board_purges()
returns integer
language plpgsql
security definer
set search_path=public,storage
as $$
declare n integer:=0;
begin
  update public.board_purge_queue q
     set asset_count=(select count(*)::integer from storage.objects o where o.bucket_id='board-assets' and o.name like q.board_id::text||'/%'),
         last_checked_at=now();
  delete from public.boards b
   using public.board_purge_queue q
   where b.id=q.board_id
     and b.deleted_at is not null
     and b.deleted_at<=now()-interval '30 days'
     and q.asset_count=0;
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.list_my_trashed_boards()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'id',b.id,'title',b.title,'owner_id',b.owner_id,'created_at',b.created_at,'updated_at',b.updated_at,
   'deleted_at',b.deleted_at,'purge_after',b.deleted_at+interval '30 days',
   'purge_queued',q.board_id is not null,'purge_asset_count',coalesce(q.asset_count,0)
 ) order by b.deleted_at desc)
 from public.boards b left join public.board_purge_queue q on q.board_id=b.id
 where b.owner_id=auth.uid() and b.deleted_at is not null),'[]'::jsonb);
end $$;

revoke all on function public.queue_expired_trashed_boards() from public,anon,authenticated;
revoke all on function public.finish_queued_board_purges() from public,anon,authenticated;
revoke all on function public.list_my_trashed_boards() from public,anon;
grant execute on function public.list_my_trashed_boards() to authenticated;

commit;

create extension if not exists pg_cron with schema extensions;
do $$
declare j bigint;
begin
 select jobid into j from cron.job where jobname='onlinerepetitor-queue-trash-purge' limit 1;
 if j is not null then perform cron.unschedule(j); end if;
 perform cron.schedule('onlinerepetitor-queue-trash-purge','17 3 * * *','select public.queue_expired_trashed_boards();');
 select jobid into j from cron.job where jobname='onlinerepetitor-finish-trash-purge' limit 1;
 if j is not null then perform cron.unschedule(j); end if;
 perform cron.schedule('onlinerepetitor-finish-trash-purge','47 3 * * *','select public.finish_queued_board_purges();');
end $$;
