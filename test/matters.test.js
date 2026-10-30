'use strict';
// Saved matters: encryption, index, reopen, delete, recovery from a lost index.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createMatterStore } = require('../src/matters');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-matters-'));
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from([...s].reverse().join(''), 'utf8'),
  decryptString: (b) => [...b.toString('utf8')].reverse().join(''),
};
const store = createMatterStore({ dir: () => dir, safeStorage });
const folder = path.join(dir, 'matters');

assert.deepStrictEqual(store.list(), []);
assert.strictEqual(store.lastOpened(), null);

// Create: gets an id, default title, timestamps; becomes "last opened".
const a = store.save({ title: '', facts: 'Priya Shetty paid Rs. 2,70,000 to Ramesh Kumar.', draft: 'LEGAL NOTICE' });
assert(/^[0-9a-f-]{36}$/.test(a.id) && a.title === 'Untitled matter');
assert.strictEqual(store.lastOpened(), a.id);

// Client details are never on disk in plain text — neither the matter nor the index.
const b = store.save({ title: 'Shetty v. Kumar', facts: 'Confidential fact XYZ' });
for (const f of fs.readdirSync(folder)) {
  const raw = fs.readFileSync(path.join(folder, f), 'utf8');
  assert(!/Shetty|Kumar|Confidential|2,70,000/.test(raw), `plain text found in ${f}`);
  assert(raw.startsWith('ENC1:'), `${f} not encrypted`);
}

// Update keeps the id and createdAt, moves updatedAt; list is newest first.
const b2 = store.save({ id: b.id, title: 'Shetty v. Kumar (deposit)', facts: 'Updated' });
assert.strictEqual(b2.id, b.id);
assert.strictEqual(b2.createdAt, b.createdAt);
assert(b2.updatedAt >= b.updatedAt);
assert.deepStrictEqual(store.list().map((m) => m.title), ['Shetty v. Kumar (deposit)', 'Untitled matter']);

// Open returns everything saved and records it as last opened.
const opened = store.get(a.id);
assert.strictEqual(opened.facts, 'Priya Shetty paid Rs. 2,70,000 to Ramesh Kumar.');
assert.strictEqual(opened.draft, 'LEGAL NOTICE');
assert.strictEqual(store.lastOpened(), a.id);

// An unknown id is never trusted as a file name.
assert.throws(() => store.get('../../config'), /Invalid matter id/);
// Saving with an id that doesn't exist creates a new matter rather than writing to it.
const c = store.save({ id: '00000000-0000-0000-0000-000000000000', title: 'Other' });
assert.notStrictEqual(c.id, '00000000-0000-0000-0000-000000000000');

// Lost index: rebuilt from the matter files.
fs.unlinkSync(path.join(folder, 'index.json'));
assert.deepStrictEqual(store.list().map((m) => m.title).sort(), ['Other', 'Shetty v. Kumar (deposit)', 'Untitled matter']);

// Delete removes the file and the entry; clears "last opened" if it was that one.
store.get(c.id);
store.remove(c.id);
assert(!fs.existsSync(path.join(folder, `${c.id}.json`)));
assert.strictEqual(store.lastOpened(), null);
assert.strictEqual(store.list().length, 2);
store.remove(c.id); // deleting twice is harmless

// Without OS encryption: plain JSON, still works; encrypted ones can't be opened.
const plain = createMatterStore({ dir: () => dir, safeStorage: { isEncryptionAvailable: () => false } });
assert.throws(() => plain.get(a.id), /OS keychain is unavailable/);

console.log('matters: all passed');
