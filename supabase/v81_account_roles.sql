-- OnlineRepetitor v81 — account roles: teacher / student
begin;

alter table public.profiles
  add column if not exists account_role text not null default 'teacher'
  check(account_role in ('teacher','student'));

update public.profiles set account_role='teacher' where account_role is null or account_role not in ('teacher','student');

create or replace function public.get_my_account_role()
returns text language sql stable security definer set search_path=public as $$
  select coalesce((select account_role from public.profiles where id=auth.uid()),'teacher')
$$;

create or replace function public.set_my_account_role(p_role text)
returns text language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 if p_role not in ('teacher','student') then raise exception 'Некорректная роль'; end if;
 update public.profiles set account_role=p_role where id=auth.uid();
 if not found then
   insert into public.profiles(id,display_name,email,account_role)
   select u.id,coalesce(nullif(u.raw_user_meta_data->>'display_name',''),split_part(coalesce(u.email,''),'@',1),'Пользователь'),coalesce(u.email,''),p_role
   from auth.users u where u.id=auth.uid();
 end if;
 return p_role;
end $$;

revoke all on function public.get_my_account_role() from public,anon;
grant execute on function public.get_my_account_role() to authenticated;
revoke all on function public.set_my_account_role(text) from public,anon;
grant execute on function public.set_my_account_role(text) to authenticated;

commit;
