// Runs supabase/schema.sql on a throwaway Postgres and proves who can do what. No Supabase project needed.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const sql = f => readFileSync(new URL(`../supabase/${f}`, import.meta.url), 'utf8');
const db = new PGlite({ extensions: { pg_trgm } });
await db.exec(sql('check-stubs.sql'));
await db.exec(sql('schema.sql'));
await db.exec("insert into public.admins values ('00000000-0000-0000-0000-000000000001')");
await db.exec(sql('check.sql'));
console.log('All access checks passed');
await db.close();
