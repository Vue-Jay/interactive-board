import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

function store(remote = true) {
  const calls = [], storage = new Map();
  const row = { id: 'board-id', owner_id: 'jwt-user', title: 'Board', created_at: '2026-09-24', updated_at: '2026-09-24' };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/boardStore.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, crypto: { randomUUID },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    require: name => name === './boardModel' ? { STORAGE_KEY: 'lesson-board.document.v1' } : name === './authStore' ? {} : {
      isRemoteBackendEnabled: () => remote,
      remoteRequest: async (path, init) => {
        calls.push({ path, ...init });
        if (path === '/rest/v1/rpc/create_board') return { ...row, title: JSON.parse(init.body).p_title };
        return [row];
      },
    },
  });
  return { ...exports, calls, storage };
}

test('remote creation uses RPC and returns authenticated creator as owner', async () => {
  const s = store();
  const board = await s.createBoard({ id: 'jwt-user' }, '  My board  ');
  assert.equal(board.ownerId, 'jwt-user');
  assert.equal(board.role, 'owner');
  assert.equal(board.title, 'My board');
  assert.equal(s.calls[0].path, '/rest/v1/rpc/create_board');
  assert.equal(s.calls[0].method, 'POST');
});

test('spoofed client identity is not sent and cannot select the returned owner', async () => {
  const s = store();
  const board = await s.createBoard({ id: 'arbitrary-other-user', owner_id: 'attacker' }, 'Board');
  assert.deepEqual(JSON.parse(s.calls[0].body), { p_title: 'Board' });
  assert.equal(board.ownerId, 'jwt-user');
  assert.equal(s.calls.length, 1);
});

test('local board creation and legacy document migration remain unchanged', async () => {
  const s = store(false);
  s.storage.set('lesson-board.document.v1', '{"version":1}');
  const board = await s.createBoard({ id: 'local-user' }, '  Local board  ', true);
  assert.equal(board.ownerId, 'local-user');
  assert.equal(board.role, 'owner');
  assert.equal(board.title, 'Local board');
  assert.equal(s.calls.length, 0);
  assert.equal(JSON.parse(s.storage.get('lesson-board.boards.v1'))[0].id, board.id);
  assert.equal(s.storage.get(s.boardStorageKey(board.id)), '{"version":1}');
});

test('rename, delete and touch never send client identity as mutation data', async () => {
  const s = store();
  await s.renameBoard('spoofed-id', 'board-id', 'Renamed');
  await s.deleteBoard('spoofed-id', 'board-id');
  await s.touchBoard('spoofed-id', 'board-id', 'Touched');
  for (const call of s.calls.filter(call => call.method)) {
    assert.ok(['PATCH', 'DELETE'].includes(call.method));
    assert.equal(call.path.includes('spoofed-id'), false);
    const body = JSON.parse(call.body ?? '{}');
    assert.equal('owner_id' in body, false);
    assert.equal('user_id' in body, false);
    assert.equal(Object.values(body).includes('spoofed-id'), false);
  }
});

test('SQL contract: fixed identity, null-auth rejection, restricted execution and no RLS changes', () => {
  const sql = readFileSync(new URL('../supabase/v21_fix_create_board.sql', import.meta.url), 'utf8');
  assert.match(sql, /create or replace function public\.create_board\(p_title text\)/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /v_owner uuid := auth\.uid\(\)/i);
  assert.match(sql, /if v_owner is null then\s+raise exception .*errcode = '42501'/i);
  assert.match(sql, /values \(coalesce\(nullif\(btrim\(p_title\), ''\), 'Новая доска'\), v_owner\)/i);
  assert.match(sql, /revoke all on function public\.create_board\(text\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.create_board\(text\) to authenticated/i);
  assert.doesNotMatch(sql, /(?:drop|alter|create) policy|disable row level security/i);
  const setup = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8');
  assert.ok(setup.includes(sql));
});
