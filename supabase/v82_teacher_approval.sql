-- OnlineRepetitor v82
-- Teacher approval by administrator. Run AFTER v81.

begin;

alter table public.profiles
  add column if not exists teacher_status text not null default 'none'
  check (teacher_status in ('none','pending','approved','rejected'));
alter table public.profiles add column if not exists teacher_requested_at timestamptz;
alter table public.profiles add column if not exists teacher_reviewed_at timestamptz;
alter table public.profiles add column if not exists teacher_reviewed_by uuid references auth.users(id) on delete set null;

create table if not exists public.app_admins(
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select p_user is not null and exists(select 1 from public.app_admins a where a.user_id=p_user)
$$;

create or replace function public.is_approved_teacher(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_app_admin(p_user) or exists(
    select 1 from public.profiles p
    where p.id=p_user and p.account_role='teacher' and p.teacher_status='approved'
  )
$$;

-- v81 allowed self-promotion. Existing teacher choices become requests until reviewed.
update public.profiles
set teacher_status=case when account_role='teacher' then 'pending' else teacher_status end,
    teacher_requested_at=case when account_role='teacher' then coalesce(teacher_requested_at,now()) else teacher_requested_at end,
    account_role=case when account_role='teacher' then 'student' else account_role end
where not public.is_app_admin(id);

create or replace function public.get_my_account_access()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p public.profiles; adm boolean;
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 select * into p from public.profiles where id=auth.uid();
 adm:=public.is_app_admin(auth.uid());
 return jsonb_build_object(
   'role',case when adm or (p.account_role='teacher' and p.teacher_status='approved') then 'teacher' else 'student' end,
   'teacher_status',case when adm then 'approved' else coalesce(p.teacher_status,'none') end,
   'is_admin',adm,
   'requested_at',p.teacher_requested_at,
   'reviewed_at',p.teacher_reviewed_at
 );
end $$;

create or replace function public.get_my_account_role()
returns text language sql stable security definer set search_path=public as $$
 select case when public.is_approved_teacher(auth.uid()) then 'teacher' else 'student' end
$$;

create or replace function public.request_teacher_access()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 if public.is_app_admin(auth.uid()) then return public.get_my_account_access(); end if;
 update public.profiles set account_role='student',teacher_status='pending',teacher_requested_at=now(),teacher_reviewed_at=null,teacher_reviewed_by=null where id=auth.uid();
 return public.get_my_account_access();
end $$;

-- Keep old v81 RPC compatible, but teacher no longer means self-approval.
create or replace function public.set_my_account_role(p_role text)
returns text language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 if p_role='teacher' then
   perform public.request_teacher_access();
   return 'student';
 elsif p_role='student' then
   update public.profiles set account_role='student',
     teacher_status=case when teacher_status='approved' then 'none' else teacher_status end
   where id=auth.uid();
   return 'student';
 end if;
 raise exception 'Некорректная роль';
end $$;

create or replace function public.list_teacher_requests()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_app_admin(auth.uid()) then raise exception 'Недостаточно прав' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'user_id',p.id,'name',p.display_name,'email',p.email,'status',p.teacher_status,
   'requested_at',p.teacher_requested_at,'reviewed_at',p.teacher_reviewed_at
 ) order by case p.teacher_status when 'pending' then 0 else 1 end,p.teacher_requested_at desc nulls last)
 from public.profiles p where p.teacher_status in ('pending','approved','rejected')),'[]'::jsonb);
end $$;

create or replace function public.review_teacher_request(p_user_id uuid,p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_app_admin(auth.uid()) then raise exception 'Недостаточно прав' using errcode='42501'; end if;
 if p_user_id=auth.uid() then raise exception 'Администратор уже имеет права преподавателя'; end if;
 update public.profiles set
   account_role=case when p_approve then 'teacher' else 'student' end,
   teacher_status=case when p_approve then 'approved' else 'rejected' end,
   teacher_reviewed_at=now(),teacher_reviewed_by=auth.uid()
 where id=p_user_id;
 if not found then raise exception 'Пользователь не найден'; end if;
 return jsonb_build_object('ok',true,'status',case when p_approve then 'approved' else 'rejected' end);
end $$;

-- Students cannot create their own boards through either REST insert or create_board RPC.
drop policy if exists boards_insert_owner on public.boards;
create policy boards_insert_owner on public.boards for insert to authenticated
with check(owner_id=auth.uid() and public.is_approved_teacher(auth.uid()));

create or replace function public.create_board(p_title text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_board public.boards%rowtype;
begin
 if v_owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not public.is_approved_teacher(v_owner) then raise exception 'Создавать доски может только одобренный преподаватель' using errcode='42501'; end if;
 insert into public.boards(title,owner_id) values(coalesce(nullif(btrim(p_title),''),'Новая доска'),v_owner) returning * into v_board;
 return to_jsonb(v_board);
end $$;

-- Students also cannot create/edit a private template library.
drop policy if exists "templates owner all" on public.board_templates;
create policy "templates owner read" on public.board_templates for select to authenticated using(owner_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "templates teacher insert" on public.board_templates for insert to authenticated with check(owner_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "templates teacher update" on public.board_templates for update to authenticated using(owner_id=auth.uid() and public.is_approved_teacher(auth.uid())) with check(owner_id=auth.uid() and public.is_approved_teacher(auth.uid()));
create policy "templates teacher delete" on public.board_templates for delete to authenticated using(owner_id=auth.uid() and public.is_approved_teacher(auth.uid()));

-- A student cannot impersonate a teacher by writing teacher-owned records directly.
drop policy if exists "assignment teacher insert" on public.assignments;
create policy "assignment teacher insert" on public.assignments for insert to authenticated with check (
 teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())
 and exists(select 1 from public.boards b join public.board_members bm on bm.board_id=b.id where b.owner_id=auth.uid() and bm.user_id=assignments.student_id and (assignments.board_id is null or b.id=assignments.board_id))
);
drop policy if exists "assignment teacher update" on public.assignments;
create policy "assignment teacher update" on public.assignments for update to authenticated using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid())) with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));
drop policy if exists "assignment teacher delete" on public.assignments;
create policy "assignment teacher delete" on public.assignments for delete to authenticated using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()));

drop policy if exists "teacher owns student profiles" on public.student_profiles;
create policy "teacher owns student profiles" on public.student_profiles for all to authenticated
using(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()))
with check(teacher_id=auth.uid() and public.is_approved_teacher(auth.uid()) and exists(
 select 1 from public.boards b join public.board_members bm on bm.board_id=b.id
 where b.owner_id=auth.uid() and bm.user_id=student_profiles.student_id
));

revoke all on function public.is_app_admin(uuid) from public,anon;
revoke all on function public.is_approved_teacher(uuid) from public,anon;
revoke all on function public.get_my_account_access() from public,anon;
revoke all on function public.request_teacher_access() from public,anon;
revoke all on function public.list_teacher_requests() from public,anon,authenticated;
revoke all on function public.review_teacher_request(uuid,boolean) from public,anon,authenticated;
grant execute on function public.is_app_admin(uuid),public.is_approved_teacher(uuid),public.get_my_account_access(),public.request_teacher_access() to authenticated;
grant execute on function public.list_teacher_requests(),public.review_teacher_request(uuid,boolean) to authenticated;

drop policy if exists "admins read admins" on public.app_admins;
create policy "admins read admins" on public.app_admins for select to authenticated using(public.is_app_admin(auth.uid()));
grant select on public.app_admins to authenticated;

commit;

-- IMPORTANT: after running this migration, appoint at least one administrator ONCE in SQL Editor:
-- insert into public.app_admins(user_id)
-- select id from auth.users where lower(email)=lower('YOUR_ADMIN_EMAIL');
