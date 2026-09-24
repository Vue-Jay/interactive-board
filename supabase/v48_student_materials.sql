create table if not exists public.material_links(
 id uuid primary key, teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 material_id uuid not null references public.materials(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 assignment_id uuid references public.assignments(id) on delete cascade, created_at timestamptz not null default now()
);
alter table public.material_links enable row level security;
drop policy if exists "material links read" on public.material_links;
drop policy if exists "material links teacher insert" on public.material_links;
drop policy if exists "material links teacher delete" on public.material_links;
create policy "material links read" on public.material_links for select to authenticated using(teacher_id=auth.uid() or student_id=auth.uid());
create policy "material links teacher insert" on public.material_links for insert to authenticated with check(teacher_id=auth.uid() and exists(select 1 from public.materials m where m.id=material_id and m.owner_id=auth.uid()));
create policy "material links teacher delete" on public.material_links for delete to authenticated using(teacher_id=auth.uid());
grant select,insert,delete on public.material_links to authenticated;
create index if not exists material_links_student_idx on public.material_links(student_id,created_at desc);
create index if not exists material_links_assignment_idx on public.material_links(assignment_id);
create or replace function public.list_linked_materials(p_student_id uuid default null)
returns table(id uuid,material_id uuid,student_id uuid,assignment_id uuid,material_title text,file_name text,mime text,storage_path text,created_at timestamptz)
language sql security definer set search_path=public stable as $$
 select l.id,l.material_id,l.student_id,l.assignment_id,m.title,m.file_name,m.mime,m.storage_path,l.created_at
 from public.material_links l join public.materials m on m.id=l.material_id
 where (l.teacher_id=auth.uid() and (p_student_id is null or l.student_id=p_student_id))
 or (l.student_id=auth.uid() and (p_student_id is null or p_student_id=auth.uid()))
 order by l.created_at desc $$;
grant execute on function public.list_linked_materials(uuid) to authenticated;
drop policy if exists materials_storage_student_select on storage.objects;
create policy materials_storage_student_select on storage.objects for select to authenticated using(
 bucket_id='materials' and exists(select 1 from public.materials m join public.material_links l on l.material_id=m.id where m.storage_path=name and l.student_id=auth.uid())
);
