-- OnlineRepetitor v116: server-backed QA bug reports
begin;

create table if not exists public.qa_reports(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  test_id text not null check(char_length(test_id) between 1 and 120),
  title text not null check(char_length(title) between 1 and 180),
  description text not null check(char_length(description) between 1 and 6000),
  expected text not null default '' check(char_length(expected)<=3000),
  environment text not null default '' check(char_length(environment)<=1000),
  severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','in_progress','fixed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists qa_reports_created_idx on public.qa_reports(created_at desc);
create index if not exists qa_reports_user_idx on public.qa_reports(user_id,created_at desc);
alter table public.qa_reports enable row level security;

drop policy if exists "qa own or admin read" on public.qa_reports;
create policy "qa own or admin read" on public.qa_reports for select to authenticated
using(user_id=auth.uid() or public.is_app_admin(auth.uid()));
drop policy if exists "qa own insert" on public.qa_reports;
create policy "qa own insert" on public.qa_reports for insert to authenticated
with check(user_id=auth.uid());
drop policy if exists "qa admin update" on public.qa_reports;
create policy "qa admin update" on public.qa_reports for update to authenticated
using(public.is_app_admin(auth.uid())) with check(public.is_app_admin(auth.uid()));

create or replace function public.touch_qa_report_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists qa_reports_touch_updated_at on public.qa_reports;
create trigger qa_reports_touch_updated_at before update on public.qa_reports for each row execute function public.touch_qa_report_updated_at();

grant select,insert,update on public.qa_reports to authenticated;
commit;
