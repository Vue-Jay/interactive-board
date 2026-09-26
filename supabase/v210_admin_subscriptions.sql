-- OnlineRepetitor v210
-- Administrator user list + manual subscription grants.
-- Run once in Supabase SQL Editor AFTER v82.

begin;

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free'
  check (subscription_plan in ('free','basic','pro'));
alter table public.profiles add column if not exists subscription_until timestamptz;
alter table public.profiles add column if not exists subscription_granted_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists subscription_updated_at timestamptz;

create or replace function public.get_my_account_access()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p public.profiles; adm boolean; effective_plan text;
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 select * into p from public.profiles where id=auth.uid();
 adm:=public.is_app_admin(auth.uid());
 effective_plan:=case
   when coalesce(p.subscription_plan,'free')='free' then 'free'
   when p.subscription_until is not null and p.subscription_until < now() then 'free'
   else p.subscription_plan
 end;
 return jsonb_build_object(
   'role',case when adm or (p.account_role='teacher' and p.teacher_status='approved') then 'teacher' else 'student' end,
   'teacher_status',case when adm then 'approved' else coalesce(p.teacher_status,'none') end,
   'is_admin',adm,
   'requested_at',p.teacher_requested_at,
   'reviewed_at',p.teacher_reviewed_at,
   'subscription_plan',effective_plan,
   'subscription_until',case when effective_plan='free' then null else p.subscription_until end
 );
end $$;

create or replace function public.admin_list_users()
returns jsonb language plpgsql stable security definer set search_path=public as $$
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
 ),'[]'::jsonb);
end $$;

create or replace function public.admin_set_subscription(p_user_id uuid,p_plan text,p_until timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_app_admin(auth.uid()) then raise exception 'Недостаточно прав' using errcode='42501'; end if;
 if p_plan not in ('free','basic','pro') then raise exception 'Неизвестный тариф'; end if;
 if p_plan<>'free' and (p_until is null or p_until<=now()) then raise exception 'Укажите будущую дату окончания подписки'; end if;
 update public.profiles set
   subscription_plan=p_plan,
   subscription_until=case when p_plan='free' then null else p_until end,
   subscription_granted_by=auth.uid(),
   subscription_updated_at=now()
 where id=p_user_id;
 if not found then raise exception 'Пользователь не найден'; end if;
 return jsonb_build_object('ok',true,'plan',p_plan,'until',case when p_plan='free' then null else p_until end);
end $$;

revoke all on function public.admin_list_users() from public,anon,authenticated;
revoke all on function public.admin_set_subscription(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_list_users(),public.admin_set_subscription(uuid,text,timestamptz) to authenticated;

commit;
