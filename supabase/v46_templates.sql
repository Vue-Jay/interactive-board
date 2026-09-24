-- OnlineRepetitor v46: reusable board templates
create table if not exists public.board_templates(
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null,
 description text not null default '',
 category text not null default '',
 document jsonb not null,
 use_count integer not null default 0 check(use_count>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.board_templates enable row level security;
drop policy if exists "templates owner all" on public.board_templates;
create policy "templates owner all" on public.board_templates for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select,insert,update,delete on public.board_templates to authenticated;
create index if not exists templates_owner_updated_idx on public.board_templates(owner_id,updated_at desc);
create or replace function public.mark_template_used(p_template_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin update public.board_templates set use_count=use_count+1,updated_at=now() where id=p_template_id and owner_id=auth.uid();if not found then raise exception 'template_not_available';end if;end $$;
grant execute on function public.mark_template_used(uuid) to authenticated;
