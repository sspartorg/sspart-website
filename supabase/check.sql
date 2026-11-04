-- Proves the access rules on a throwaway database: run `npm run test:schema` from tests/.
-- Each statement that must be refused goes through must_fail().

create or replace procedure must_fail(q text) language plpgsql as $$
begin
  execute q;
  raise exception 'expected failure, but this succeeded: %', q using errcode = 'XX000';
exception
  when sqlstate 'XX000' then raise;
  when others then null;
end $$;
grant execute on procedure must_fail(text) to public;

-- Visitors
set role anon;
insert into public.enquiries (name, mobile, message, product) values ('Asha', '+91 95150 93965', 'Pricing please', 'Atlas');
call must_fail($$ insert into public.enquiries (name, mobile, message, status) values ('X', '9515093965', 'm', 'won') $$);
call must_fail($$ insert into public.enquiries (name, mobile, message) values ('X', 'not a number', 'm') $$);
call must_fail($$ insert into public.enquiries (name, mobile, message) values ('X', '123', 'm') $$);
call must_fail($$ insert into public.enquiries (name, mobile, message, email) values ('X', '9515093965', 'm', 'nope') $$);
call must_fail($$ select * from public.enquiries $$);
call must_fail($$ select * from public.enquiry_comments $$);
call must_fail($$ select * from public.admins $$);
call must_fail($$ update public.enquiries set status = 'won' $$);
call must_fail($$ delete from public.enquiries $$);
select public.ping();
insert into public.enquiries (name, mobile, message) select 'Bot', '9000000001', 'spam' from generate_series(1, 5);
call must_fail($$ insert into public.enquiries (name, mobile, message) values ('Bot', '90000-00001', 'spam') $$);
reset role;

-- A signed-in account that isn't in admins, as if sign-ups were left on
select set_config('request.uid', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin
  if (select count(*) from public.enquiries) <> 0 then raise exception 'stranger can read enquiries'; end if;
end $$;
call must_fail($$ insert into public.enquiry_comments (enquiry_id, body) select gen_random_uuid(), 'x' $$);
reset role;

-- The owner
select set_config('request.uid', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claims', '{"email":"owner@example.com"}', false);
set role authenticated;
do $$
declare e uuid;
begin
  select id into e from public.enquiries where mobile_digits like '%9515093965%';
  if e is null then raise exception 'mobile search found nothing'; end if;
  update public.enquiries set status = 'contacted' where id = e;
  insert into public.enquiry_comments (enquiry_id, body) values (e, 'Called, sending a quote');
  if (select author_email from public.enquiry_comments where enquiry_id = e) <> 'owner@example.com' then raise exception 'comment author wrong'; end if;
  delete from public.enquiries where id = e;
  if exists (select 1 from public.enquiry_comments where enquiry_id = e) then raise exception 'comments outlived the enquiry'; end if;
end $$;
call must_fail($$ update public.enquiries set message = 'rewritten' $$);
call must_fail($$ select * from public.admins $$);
reset role;

select 'all access checks passed' as result;
