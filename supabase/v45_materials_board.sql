-- OnlineRepetitor v45: reusable materials
alter table public.materials add column if not exists favorite boolean not null default false;
alter table public.materials add column if not exists use_count integer not null default 0 check(use_count>=0);
alter table public.materials add column if not exists last_used_at timestamptz;
create index if not exists materials_owner_recent_idx on public.materials(owner_id,favorite desc,last_used_at desc);

create or replace function public.mark_material_used(p_material_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.materials set use_count=use_count+1,last_used_at=now()
 where id=p_material_id and owner_id=auth.uid();
 if not found then raise exception 'material_not_available'; end if;
end $$;
grant execute on function public.mark_material_used(uuid) to authenticated;
