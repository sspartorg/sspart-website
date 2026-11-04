-- The parts of Supabase that schema.sql relies on, for the throwaway database in tests/schema-check.js
create schema if not exists extensions;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth, extensions to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
grant usage on schema auth to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001', 'owner@example.com'), ('00000000-0000-0000-0000-000000000002', 'stranger@example.com');
