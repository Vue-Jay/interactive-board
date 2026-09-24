// Run explicitly with PGLITE_MODULE pointing to a temporary PGlite installation.
// No production Supabase data is touched. No extra project dependency is needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to the temporary @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.boards (
      id uuid primary key, owner_id uuid references auth.users(id), title text,
      created_at timestamptz default now(), updated_at timestamptz default now()
    );
    create table public.board_members (
      board_id uuid references public.boards(id) on delete cascade,
      user_id uuid references auth.users(id), role text check (role in ('viewer','editor')),
      added_at timestamptz default now(), primary key (board_id, user_id)
    );
    create function public.is_board_owner(p_board_id uuid) returns boolean
    language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.boards where id=p_board_id and owner_id=auth.uid());
    $$;
    insert into auth.users values
      ('00000000-0000-0000-0000-000000000001'),
      ('00000000-0000-0000-0000-000000000002');
    insert into public.boards(id,owner_id,title) values
      ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','A'),
      ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','B');
  `);
  const migration = readFileSync(new URL('../supabase/v22_share_links.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Idempotency is tested by executing it, not matching strings.
  const owner = '00000000-0000-0000-0000-000000000001';
  const member = '00000000-0000-0000-0000-000000000002';
  const board = '10000000-0000-0000-0000-000000000001';
  const otherBoard = '10000000-0000-0000-0000-000000000002';
  const user = async id => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? '']); await db.exec('set role authenticated'); };
  const rpc = async (name, args) => (await db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as result`, args)).rows[0].result;
  await user(owner);
  const viewer = await rpc('create_board_share_link', [board, 'viewer']);
  const editor = await rpc('create_board_share_link', [board, 'editor']);
  assert.match(viewer.token, /^[0-9a-f]{64}$/);
  const listed = await rpc('list_board_share_links', [board]);
  assert.ok(listed.every(row => !('token' in row) && !('token_hash' in row)));
  await assert.rejects(db.query('select * from public.board_share_links'), /permission denied/);
  await db.exec('reset role');
  const stored = (await db.query('select * from public.board_share_links where id=$1', [viewer.id])).rows[0];
  assert.ok(!JSON.stringify(stored).includes(viewer.token));
  assert.equal(stored.token_hash, (await db.query("select encode(sha256(convert_to($1,'UTF8')),'hex') as hash", [viewer.token])).rows[0].hash);
  await user(member);
  assert.equal((await rpc('redeem_board_share_link', [viewer.token])).role, 'viewer');
  assert.equal((await rpc('redeem_board_share_link', [editor.token])).role, 'editor');
  assert.equal((await rpc('redeem_board_share_link', [viewer.token])).role, 'viewer'); // No higher role retained.
  await rpc('redeem_board_share_link', [viewer.token]);
  await assert.rejects(rpc('redeem_board_share_link', [viewer.token, otherBoard]), /does not exist/);
  await assert.rejects(rpc('create_board_share_link', [board, 'editor']), /Only the board owner/);
  await assert.rejects(rpc('list_board_share_links', [board]), /Only the board owner/);
  await assert.rejects(rpc('revoke_board_share_link', [viewer.id]), /Only the board owner/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from public.board_members where board_id=$1 and user_id=$2', [board, member])).rows[0].n, 1);
  assert.equal((await db.query('select count(*)::int as n from public.board_members where board_id=$1', [otherBoard])).rows[0].n, 0);
  await user(owner);
  assert.equal((await rpc('redeem_board_share_link', [viewer.token])).role, 'owner');
  await assert.rejects(rpc('create_board_share_link', [board, 'owner']), /Invalid link role/);
  await rpc('revoke_board_share_link', [viewer.id]);
  await rpc('revoke_board_share_link', [viewer.id]);
  await user(member);
  await assert.rejects(rpc('redeem_board_share_link', [viewer.token]), /invalid, expired or revoked/);
  await db.exec('reset role');
  await db.query("update public.board_share_links set expires_at=now()-interval '1 second' where id=$1", [editor.id]);
  await user(member);
  await assert.rejects(rpc('redeem_board_share_link', [editor.token]), /invalid, expired or revoked/);
  await user(null);
  await assert.rejects(rpc('redeem_board_share_link', [editor.token]), /Authentication required/);
  await db.exec('reset role; set role anon');
  await assert.rejects(rpc('redeem_board_share_link', [editor.token]), /permission denied/);
  console.log('SQL integration passed: roles, owner, hash-only storage, revocation, expiry, board isolation, duplicates, permissions, idempotency.');
} finally { await db.close(); }
