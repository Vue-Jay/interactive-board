import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(name, globals) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, ...globals });
  return exports;
}
test('share RPC payload cannot specify a board or role during redemption', async () => {
  const calls = [];
  const api = load('shareLinks', { require: () => ({ isRemoteBackendEnabled: () => true,
    remoteRequest: async (path, request) => { calls.push([path, JSON.parse(request.body)]); return {}; },
  }) });
  const token = 'a'.repeat(64);
  await api.createShareLink('board-a', 'viewer');
  await api.redeemShareLink(token, 'board-b', 'editor');
  assert.deepEqual(calls[0], ['/rest/v1/rpc/create_board_share_link', { p_board_id: 'board-a', p_role: 'viewer' }]);
  assert.deepEqual(calls[1], ['/rest/v1/rpc/redeem_board_share_link', { p_token: token }]);
  await assert.rejects(api.redeemShareLink('../invalid'));
  assert.equal(calls.length, 2);
});

test('local mode never sends share tokens to a remote service', async () => {
  const api = load('shareLinks', { require: () => ({ isRemoteBackendEnabled: () => false,
    remoteRequest: () => assert.fail('unexpected remote call'),
  }) });
  await assert.rejects(api.createShareLink('board', 'viewer'));
  await assert.rejects(api.redeemShareLink('a'.repeat(64)));
});

test('direct board/join routes and pending token survive login reload, then clear', () => {
  const memory = new Map();
  const token = 'b'.repeat(64);
  const globals = { window: { location: { pathname: `/join/${token}` } }, sessionStorage: {
    getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key),
  } };
  const routes = load('routes', globals);
  assert.equal(routes.initialRoute().token, token);
  globals.window.location.pathname = '/';
  assert.equal(load('routes', globals).initialRoute().token, token);
  routes.clearPendingShare();
  assert.equal(routes.initialRoute().kind, 'home');
  assert.equal(routes.parseRoute('/board/00000000-0000-0000-0000-000000000001').kind, 'board');
  assert.equal(routes.parseRoute('/board/../../bad').kind, 'invalid');
  assert.equal(routes.parseRoute('/join/invalid').kind, 'invalid');
});

test('Vercel deep links fall back to SPA; tokens do not enter referrer headers', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
  assert.ok(config.headers.some(entry => entry.headers.some(h => h.key === 'Referrer-Policy' && h.value === 'no-referrer')));
  const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8').trim().split(/\r?\n/);
  assert.deepEqual(env, ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY=']);
});

test('setup includes the exact idempotent share link migration', () => {
  const sql = readFileSync(new URL('../supabase/v22_share_links.sql', import.meta.url), 'utf8');
  assert.ok(readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8').includes(sql));
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public.board_share_links from public, anon, authenticated/);
});
