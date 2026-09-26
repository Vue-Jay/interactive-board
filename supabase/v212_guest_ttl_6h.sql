-- OnlineRepetitor v212
-- Guest accounts live for at most 6 hours, then are removed automatically.
-- Run once AFTER v210_admin_subscriptions.sql.
-- v211 is NOT required. If it was already applied, this migration safely replaces its behavior.

begin;

create extension if not exists pg_cron with schema extensions;

-- Internal cleanup function. It is deliberately not executable through the public API.
create or replace function public.cleanup_expired_guest_accounts()
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare deleted_count integer;
begin
  delete from auth.users u
  where u.created_at < now() - interval '6 hours'
    and (
      coalesce(u.is_anonymous,false)=true
      or coalesce((u.raw_user_meta_data->>'is_guest')::boolean,false)=true
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;

revoke all on function public.cleanup_expired_guest_accounts() from public,anon,authenticated;

-- Remove the old immediate-delete RPC if v211 was previously installed.
drop function if exists public.delete_my_guest_account();

-- Keep guests out of the administrator's persistent user registry.
create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.is_app_admin(auth.uid()) then raise exception 'Недостаточно прав' using errcode='42501'; end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'user_id',p.id,
     'name',coalesce(nullif(p.display_name,''),'Пользователь'),
     'email',coalesce(p.email,''),
     'role',case when public.is_app_admin(p.id) or (p.account_role='teacher' and p.teacher_status='approved') then 'teacher' else 'student' end,
     'teacher_status',coalesce(p.teacher_status,'none'),
     'is_admin',public.is_app_admin(p.id),
     'subscription_plan',case when coalesce(p.subscription_plan,'free')<>'free' and p.subscription_until is not null and p.subscription_until<now() then 'free' else coalesce(p.subscription_plan,'free') end,
     'subscription_until',p.subscription_until,
     'created_at',u.created_at
   ) order by u.created_at desc)
   from public.profiles p
   join auth.users u on u.id=p.id
   where coalesce(u.is_anonymous,false)=false
     and coalesce((u.raw_user_meta_data->>'is_guest')::boolean,false)=false
     and u.email is not null
 ),'[]'::jsonb);
end $$;

revoke all on function public.admin_list_users() from public,anon,authenticated;
grant execute on function public.admin_list_users() to authenticated;

-- Idempotently replace this application's cleanup job.
do $$
declare job record;
begin
  for job in select jobid from cron.job where jobname='onlinerepetitor-cleanup-guests'
  loop
    perform cron.unschedule(job.jobid);
  end loop;

  perform cron.schedule(
    'onlinerepetitor-cleanup-guests',
    '*/15 * * * *',
    $cron$select public.cleanup_expired_guest_accounts();$cron$
  );
end $$;

commit;

-- Optional one-time immediate sweep after installation:
select public.cleanup_expired_guest_accounts();
