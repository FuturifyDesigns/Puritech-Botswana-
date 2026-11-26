-- Run once in the Supabase SQL Editor for project azvpkkxbtnbbgpyvzbuw.
-- Then add the approved CMS user's auth.uid() to public.editors as instructed in README.
create table if not exists public.editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 240),
  category text not null default 'Other equipment',
  description text not null default '',
  image_url text not null default '',
  source_url text not null default '',
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 240),
  subtitle text not null default '',
  image_url text not null default '',
  cta_label text not null default 'Enquire now',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.site_content (
  key text primary key,
  value text not null default ''
);

create or replace function public.is_site_editor()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.editors where user_id = (select auth.uid())) $$;

alter table public.editors enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "Editors can read own membership" on public.editors;
create policy "Editors can read own membership" on public.editors for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Visitors see published products" on public.products;
create policy "Visitors see published products" on public.products for select to anon, authenticated using (active or public.is_site_editor());
drop policy if exists "Editors manage products" on public.products;
create policy "Editors manage products" on public.products for all to authenticated using (public.is_site_editor()) with check (public.is_site_editor());

drop policy if exists "Visitors see published promotions" on public.promotions;
create policy "Visitors see published promotions" on public.promotions for select to anon, authenticated using (active or public.is_site_editor());
drop policy if exists "Editors manage promotions" on public.promotions;
create policy "Editors manage promotions" on public.promotions for all to authenticated using (public.is_site_editor()) with check (public.is_site_editor());

drop policy if exists "Visitors see page content" on public.site_content;
create policy "Visitors see page content" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "Editors manage page content" on public.site_content;
create policy "Editors manage page content" on public.site_content for all to authenticated using (public.is_site_editor()) with check (public.is_site_editor());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public site images" on storage.objects;
create policy "Public site images" on storage.objects for select to anon, authenticated using (bucket_id = 'site-images');
drop policy if exists "Editors upload site images" on storage.objects;
create policy "Editors upload site images" on storage.objects for insert to authenticated
with check (bucket_id = 'site-images' and public.is_site_editor());
drop policy if exists "Editors remove site images" on storage.objects;
create policy "Editors remove site images" on storage.objects for delete to authenticated
using (bucket_id = 'site-images' and public.is_site_editor());
