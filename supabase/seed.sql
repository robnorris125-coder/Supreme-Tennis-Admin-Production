-- Review the authorised addresses before running this file.
-- Auth users are created or invited separately in Supabase Authentication.

insert into public.tenants (id, name, slug, status, created_at)
values ('tenant-supreme-tennis', 'Supreme Tennis', 'supreme-tennis', 'Active', now()::text)
on conflict (id) do update set name = excluded.name, status = excluded.status;

insert into public.tenant_memberships
  (tenant_id, user_email, display_name, role, status, last_signed_in_at, created_at)
values
  ('tenant-supreme-tennis', 'robnorris125@gmail.com', 'Rob Norris', 'Owner', 'Active', '', now()::text),
  ('tenant-supreme-tennis', 'info@supremetennis.co.uk', 'Jake Norris', 'Administrator', 'Active', '', now()::text)
on conflict (tenant_id, user_email) do update
set display_name = excluded.display_name,
    role = excluded.role,
    status = excluded.status;
