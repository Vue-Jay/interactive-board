import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

// Exercise the storage orchestration with deterministic local/network adapters.
function store(remote = true, persisted = {}) {
  const local = persisted.local ?? new Map(), server = persisted.server ?? new Map(), calls = [];
  const source = readFileSync(new URL('../src/assetStore.ts', import.meta.url), 'utf8')
    .replace(/const DB_NAME[\s\S]*?const synchronized/, `
      const getLocalAsset = async (id: string) => local.get(id) ?? null;
      const putLocalAsset = async (id: string, blob: Blob) => { local.set(id, blob); };
      const synchronized`);
  const backend = {
    isRemoteBackendEnabled: () => remote,
    remoteAssetRequest: async (path, blob) => {
      calls.push([path, blob ? 'upload' : 'download']);
      if (blob) { server.set(path, blob); return null; }
      if (!server.has(path)) throw new Error('Missing or forbidden');
      return server.get(path);
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: () => backend, local, Blob });
  return { ...exports, local, server, calls };
}

test('local mode retains legacy keys without network requests', async () => {
  const s = store(false), blob = new Blob(['pdf'], { type: 'application/pdf' });
  await s.putAsset('asset', blob, 'board');
  assert.equal(await s.getAsset('asset', 'board'), blob);
  assert.equal(s.local.get('asset'), blob);
  assert.equal(s.calls.length, 0);
});

test('remote upload is scoped to board; another device downloads and caches', async () => {
  const s = store(), blob = new Blob(['image'], { type: 'image/png' });
  await s.putAsset('asset', blob, 'board');
  assert.equal(s.server.get('board/asset'), blob);
  s.local.clear();
  assert.equal(await s.getAsset('asset', 'board'), blob);
  const count = s.calls.length;
  assert.equal(await s.getAsset('asset', 'board'), blob);
  assert.equal(s.calls.length, count);
  assert.equal(await s.getAsset('asset', 'other-board'), null);
  await assert.rejects(s.putAsset('../asset', blob, 'board'));
});

test('legacy migration uploads once and missing media blocks server save', async () => {
  const s = store(), blob = new Blob(['pdf'], { type: 'application/pdf' });
  s.local.set('old', blob);
  const doc = { items: [{ kind: 'pdf', assetId: 'old' }] };
  await s.ensureBoardAssets('board', doc);
  assert.equal(s.server.get('board/old'), blob);
  const count = s.calls.length;
  await s.ensureBoardAssets('board', doc);
  assert.equal(s.calls.length, count);
  await assert.rejects(s.ensureBoardAssets('board', { items: [{ kind: 'image', assetId: 'missing' }] }));
});

test('existing server media is never overwritten by a legacy cache', async () => {
  const s = store();
  const original = new Blob(['server'], { type: 'image/png' });
  s.server.set('board/asset', original);
  s.local.set('asset', new Blob(['legacy'], { type: 'image/png' }));
  await s.ensureBoardAssets('board', { items: [{ kind: 'image', assetId: 'asset' }] });
  assert.equal(s.server.get('board/asset'), original);
  assert.equal(s.calls.some(([, method]) => method === 'upload'), false);
});

for (const type of ['image/png', 'application/pdf']) {
  test(`${type}: restart retains local media and remote cache`, async () => {
    for (const remote of [false, true]) {
      const original = store(remote);
      const blob = new Blob(['content'], { type });
      await original.putAsset('asset', blob, 'board');
      const restarted = store(remote, original);
      assert.equal(await restarted.getAsset('asset', 'board'), blob);
      assert.equal(restarted.calls.length, 0);
      const offline = store(false, original);
      assert.equal(await offline.getAsset('asset', 'board'), blob);
      assert.equal(offline.calls.length, 0);
    }
  });
}

test('v19 PDF with generic MIME is migrated as application/pdf', async () => {
  const s = store();
  s.local.set('old-pdf', new Blob(['%PDF-1.4'], { type: 'application/octet-stream' }));
  await s.ensureBoardAssets('board', { items: [{ kind: 'pdf', assetId: 'old-pdf', mime: 'application/octet-stream' }] });
  const uploaded = s.server.get('board/old-pdf');
  assert.equal(uploaded.type, 'application/pdf');
  assert.equal(await uploaded.text(), '%PDF-1.4');
});

test('v19 local media is readable before Storage migration', async () => {
  const s = store();
  const blob = new Blob(['old'], { type: 'image/png' });
  s.local.set('legacy', blob);
  assert.equal(await s.getAsset('legacy', 'board'), blob);
  assert.equal(s.calls.some(([, method]) => method === 'upload'), false);
});

test('authenticated binary transport preserves MIME and propagates access denial', async () => {
  const calls = [];
  let status = 200;
  let session = { access_token: 'user-jwt', refresh_token: 'refresh', expires_at: 9999999999, user: { id: 'viewer' } };
  const exports = {};
  const source = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_SUPABASE_URL', '"https://test.invalid"')
    .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', '"public-anon-key"');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Headers,
    localStorage: { getItem: () => session ? JSON.stringify(session) : null },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/auth/v1/user')) return new Response('{}');
      return status === 200 ? new Response(new Blob(['pdf'], { type: 'application/pdf' }))
        : new Response(JSON.stringify({ message: 'Access denied' }), { status });
    },
  });
  const blob = new Blob(['pdf'], { type: 'application/pdf' });
  await exports.remoteAssetRequest('board/asset', blob);
  const upload = calls.at(-1);
  assert.equal(upload.init.headers.Authorization, 'Bearer user-jwt');
  assert.equal(upload.init.headers.apikey, 'public-anon-key');
  assert.equal(upload.init.headers['Content-Type'], 'application/pdf');
  assert.equal(upload.init.body, blob);
  const downloaded = await exports.remoteAssetRequest('board/asset');
  assert.equal(downloaded.type, 'application/pdf');
  assert.match(calls.at(-1).url, /\/object\/authenticated\/board-assets\/board\/asset$/);
  status = 403;
  await assert.rejects(exports.remoteAssetRequest('board/asset', blob), /Access denied/);
  session = null;
  const count = calls.length;
  await assert.rejects(exports.remoteAssetRequest('board/asset'));
  assert.equal(calls.length, count);
});
