-- OnlineRepetitor v44: personal materials library
insert into storage.buckets(id,name,public,file_size_limit)
values('materials','materials',false,52428800)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;

create table if not exists public.materials(
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 folder text not null default '',
 title text not null,
 file_name text not null,
 mime text not null default 'application/octet-stream',
 size_bytes bigint not null default 0 check(size_bytes>=0 and size_bytes<=52428800),
 storage_path text not null unique,
 created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
drop policy if exists "materials owner select" on public.materials;
drop policy if exists "materials owner insert" on public.materials;
drop policy if exists "materials owner update" on public.materials;
drop policy if exists "materials owner delete" on public.materials;
create policy "materials owner select" on public.materials for select to authenticated using(owner_id=auth.uid());
create policy "materials owner insert" on public.materials for insert to authenticated with check(owner_id=auth.uid() and storage_path like auth.uid()::text||'/%');
create policy "materials owner update" on public.materials for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "materials owner delete" on public.materials for delete to authenticated using(owner_id=auth.uid());
grant select,insert,update,delete on public.materials to authenticated;

drop policy if exists materials_storage_select on storage.objects;
drop policy if exists materials_storage_insert on storage.objects;
drop policy if exists materials_storage_delete on storage.objects;
create policy materials_storage_select on storage.objects for select to authenticated using(bucket_id='materials' and split_part(name,'/',1)=auth.uid()::text);
create policy materials_storage_insert on storage.objects for insert to authenticated with check(bucket_id='materials' and split_part(name,'/',1)=auth.uid()::text);
create policy materials_storage_delete on storage.objects for delete to authenticated using(bucket_id='materials' and split_part(name,'/',1)=auth.uid()::text);
