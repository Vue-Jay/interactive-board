-- OnlineRepetitor v211
-- Guests are temporary: they are not shown as saved users and are deleted on guest logout.
-- Run once AFTER v210_admin_subscriptions.sql.

begin;

create or replace function public.delete_my_guest_account()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare uid uuid:=auth.uid(); guest boolean;
begin
 if uid is null then raise exception 'Требуется авторизация'; end if;
 select coalesce((u.raw_user_meta_data->>'is_guest')::boolean,false) or coalesce(u.is_anonymous,false)
 into guest from auth.users u where u.id=uid;
 if not coalesce(guest,false) then raise exception 'Удалять можно только гостевую сессию' using errcode='42501'; end if;

 -- auth.users deletion cascades through profile/membership rows that reference the guest.
 delete from auth.users where id=uid;
 return jsonb_build_object('ok',true);
end $$;

revoke all on function public.delete_my_guest_account() from public,anon,authenticated;
grant execute on function public.delete_my_guest_account() to authenticated;

-- Replace v210 list: anonymous/guest auth rows are never part of the administrator user registry.
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

commit;
