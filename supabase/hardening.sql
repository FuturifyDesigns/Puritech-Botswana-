-- Run after schema.sql. This is safe to rerun.
-- Anonymous catalogue access stays read-only under existing RLS policies.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_image_https') then
    alter table public.products add constraint products_image_https
      check (image_url = '' or image_url ~ '^https://[^[:space:]]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_source_https') then
    alter table public.products add constraint products_source_https
      check (source_url = '' or source_url ~ '^https://[^[:space:]]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_content_lengths') then
    alter table public.products add constraint products_content_lengths
      check (length(category) between 1 and 120 and length(description) <= 8000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'promotions_content_lengths') then
    alter table public.promotions add constraint promotions_content_lengths
      check (length(subtitle) <= 2000 and length(cta_label) between 1 and 100 and (image_url = '' or image_url ~ '^https://[^[:space:]]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_content_lengths') then
    alter table public.site_content add constraint site_content_lengths
      check (length(key) between 1 and 120 and length(value) <= 12000);
  end if;
end $$;

create unique index if not exists products_active_source_url_unique
  on public.products(source_url) where active = true and source_url <> '';

create table if not exists public.cms_write_events (
  user_id uuid not null,
  written_at timestamptz not null default now()
);
create index if not exists cms_write_events_user_time
  on public.cms_write_events(user_id, written_at desc);
alter table public.cms_write_events enable row level security;
revoke all on public.cms_write_events from anon, authenticated;

create or replace function public.limit_cms_writes()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  editor_id uuid := auth.uid();
  recent_count integer;
begin
  if editor_id is null or not exists(select 1 from public.editors where user_id = editor_id) then
    raise exception 'Editor access required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(editor_id::text, 0));
  select count(*) into recent_count from public.cms_write_events
    where user_id = editor_id and written_at > now() - interval '1 minute';
  if recent_count >= 30 then
    raise exception 'Too many edits. Try again in a minute.' using errcode = 'P0001';
  end if;
  insert into public.cms_write_events(user_id) values (editor_id);
  delete from public.cms_write_events where written_at < now() - interval '1 day';
  return coalesce(new, old);
end $$;
revoke execute on function public.limit_cms_writes() from public, anon, authenticated;

drop trigger if exists products_cms_write_limit on public.products;
create trigger products_cms_write_limit before insert or update or delete on public.products
  for each row execute function public.limit_cms_writes();
drop trigger if exists promotions_cms_write_limit on public.promotions;
create trigger promotions_cms_write_limit before insert or update or delete on public.promotions
  for each row execute function public.limit_cms_writes();
drop trigger if exists site_content_cms_write_limit on public.site_content;
create trigger site_content_cms_write_limit before insert or update or delete on public.site_content
  for each row execute function public.limit_cms_writes();
