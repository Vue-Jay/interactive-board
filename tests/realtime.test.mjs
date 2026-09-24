import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../src/${file}.ts`, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, ...globals });
  return exports;
}
const { documentFingerprint, isOwnRemoteRevision, remoteUpdateDecision } = load('boardSync');
const document = { version: 1, title: 'Board', view: { x: 0, y: 0, zoom: 1 }, items: [] };

test('own echo before RPC acknowledgement waits; afterwards it cannot reapply', () => {
  assert.equal(remoteUpdateDecision(4, 5, true, true), 'defer');
  // HTTP save succeeded with version 5, but the user already made another edit.
  assert.equal(remoteUpdateDecision(5, 5, false, true), 'ignore');
  assert.equal(remoteUpdateDecision(5, 4, false, false), 'ignore');
});

test('unsaved edits and active drafts conflict; a clean viewer applies changes', () => {
  assert.equal(remoteUpdateDecision(4, 5, false, true), 'conflict');
  assert.equal(remoteUpdateDecision(4, 5, false, false), 'apply');
  // Another tab/device using the same account is still an external change.
  assert.equal(remoteUpdateDecision(5, 6, false, false), 'apply');
});

test('lost HTTP acknowledgement identifies own save without ignoring another device', () => {
  const attempt = { version: 5, fingerprint: documentFingerprint(document) };
  const row = { updated_by: 'owner', version: 5, document };
  assert.equal(isOwnRemoteRevision(row, 'owner', attempt), true);
  assert.equal(isOwnRemoteRevision({ ...row, updated_by: 'editor' }, 'owner', attempt), false);
  assert.equal(isOwnRemoteRevision({ ...row, version: 6 }, 'owner', attempt), false);
  assert.equal(isOwnRemoteRevision({ ...row, document: { ...document, title: 'Another device' } }, 'owner', attempt), false);
});

test('JSONB property ordering does not cause an autosave echo', () => {
  const reordered = { items: [], view: { zoom: 1, y: 0, x: 0 }, title: 'Board', version: 1 };
  assert.equal(documentFingerprint(document), documentFingerprint(reordered));
  assert.notEqual(documentFingerprint(document), documentFingerprint({ ...document, title: 'Local edit' }));
});

function harness(options = {}) {
  const sockets = [], statuses = [], documents = [], timers = new Map(), listeners = new Map();
  let timerId = 0;
  let reads = 0;
  class Socket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    closed = false;
    constructor(url) { this.url = url; sockets.push(this); }
    send(data) { this.sent.push(JSON.parse(data)); }
    close() { this.closed = true; this.readyState = 3; }
    open() { this.readyState = 1; this.onopen?.(); }
    message(event, payload = {}, topic = 'realtime:board:board-id', ref = null) {
      this.onmessage?.({ data: JSON.stringify({ event, payload, topic, ref }) });
    }
    ready() { this.message('system', { extension: 'postgres_changes', status: 'ok' }); }
  }
  const backend = {
    isRemoteBackendEnabled: () => options.enabled !== false,
    getRealtimeSocketUrl: () => 'wss://test.invalid?apikey=public',
    getRemoteSession: options.session ?? (async () => ({ access_token: 'user-token' })),
    getRemoteBoardDocument: async id => {
      reads++;
      return options.read ? options.read(id) : { board_id: id, version: reads, document };
    },
  };
  const clock = (callback, ms, interval) => { const id = ++timerId; timers.set(id, { callback, ms, interval }); return id; };
  const { subscribeBoardDocument } = load('boardRealtime', {
    require: () => backend, WebSocket: Socket, navigator: { onLine: true },
    setTimeout: (fn, ms) => clock(fn, ms, false), clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => clock(fn, ms, true), clearInterval: id => timers.delete(id),
    window: {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
    },
  });
  const stop = subscribeBoardDocument('board-id', row => documents.push(row), status => statuses.push(status));
  const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const fire = ms => {
    const entry = [...timers].find(([, timer]) => timer.ms === ms);
    assert.ok(entry, `expected timer ${ms}`);
    if (!entry[1].interval) timers.delete(entry[0]);
    entry[1].callback();
  };
  return { sockets, statuses, documents, timers, listeners, stop, tick, fire, reads: () => reads };
}

test('subscription uses current-board filters and JWT; ready and events fetch latest', async () => {
  const h = harness(); await h.tick();
  const ws = h.sockets[0]; ws.open();
  const join = ws.sent[0];
  assert.equal(join.event, 'phx_join');
  assert.equal(join.payload.access_token, 'user-token');
  assert.equal(join.payload.config.postgres_changes.length, 2);
  for (const filter of join.payload.config.postgres_changes) {
    assert.equal(filter.table, 'board_documents');
    assert.equal(filter.filter, 'board_id=eq.board-id');
  }
  ws.ready(); await h.tick();
  assert.equal(h.statuses.at(-1), 'online');
  assert.equal(h.documents.length, 1);
  ws.message('postgres_changes'); await h.tick();
  assert.equal(h.documents.length, 2);
  ws.message('postgres_changes', {}, 'realtime:board:other'); await h.tick();
  assert.equal(h.documents.length, 2);
  h.stop();
});

test('unmount/board switch/logout cleanup closes socket and removes all timers/listeners', async () => {
  const h = harness(); await h.tick(); const ws = h.sockets[0]; ws.open(); ws.ready(); await h.tick();
  const previousMessage = ws.onmessage;
  h.stop(); h.stop();
  assert.equal(ws.closed, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
  const count = h.reads();
  previousMessage({ data: JSON.stringify({ topic: 'realtime:board:board-id', event: 'postgres_changes' }) });
  await h.tick();
  assert.equal(h.reads(), count);
});

test('cleanup before session resolves cannot create a late socket', async () => {
  let resolve;
  const h = harness({ session: () => new Promise(done => { resolve = done; }) });
  h.stop(); resolve({ access_token: 'user-token' }); await h.tick();
  assert.equal(h.sockets.length, 0);
  assert.equal(h.timers.size, 0);
});

test('cleanup suppresses a late REST response', async () => {
  let resolve;
  const h = harness({ read: () => new Promise(done => { resolve = done; }) });
  await h.tick(); h.sockets[0].open(); h.sockets[0].ready(); await h.tick();
  h.stop(); resolve({ board_id: 'board-id', version: 8, document }); await h.tick();
  assert.equal(h.documents.length, 0);
});

test('disconnect retries and rereads changes missed during outage', async () => {
  const h = harness(); await h.tick(); const ws = h.sockets[0]; ws.open(); ws.ready(); await h.tick();
  ws.onclose();
  assert.equal(h.statuses.at(-1), 'reconnecting');
  assert.equal(ws.closed, true);
  h.fire(1000); await h.tick();
  const next = h.sockets[1]; next.open(); next.ready(); await h.tick();
  assert.equal(h.documents.length, 2);
  assert.equal(h.statuses.at(-1), 'online');
  h.stop();
});

test('unanswered heartbeat reconnects; local mode creates no subscription', async () => {
  const h = harness(); await h.tick(); h.sockets[0].open(); h.sockets[0].ready();
  h.fire(25000); h.fire(25000);
  assert.equal(h.sockets[0].closed, true);
  h.stop();
  const local = harness({ enabled: false }); await local.tick();
  assert.equal(local.sockets.length, 0);
  assert.equal(local.timers.size, 0);
  assert.equal(local.listeners.size, 0);
  local.stop();
});

test('expired JWT is refreshed on the existing channel', async () => {
  let token = 'initial-token';
  const h = harness({ session: async () => ({ access_token: token }) });
  await h.tick(); const ws = h.sockets[0]; ws.open(); ws.ready(); await h.tick();
  token = 'refreshed-token';
  h.fire(20000); await h.tick();
  const update = ws.sent.at(-1);
  assert.equal(update.event, 'access_token');
  assert.equal(update.payload.access_token, token);
  assert.equal(h.sockets.length, 1);
  h.stop();
});

test('join timeout retries and cleanup cancels the pending retry', async () => {
  const h = harness(); await h.tick(); h.sockets[0].open();
  h.fire(15000);
  assert.equal(h.sockets[0].closed, true);
  assert.equal(h.statuses.at(-1), 'reconnecting');
  assert.equal(h.timers.size, 1);
  h.stop();
  assert.equal(h.timers.size, 0);
});
