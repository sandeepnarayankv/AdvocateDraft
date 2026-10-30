'use strict';
// Settings store: encryption, migration from the single-key version, atomic writes.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStore } = require('../src/credentials');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-cred-'));
// Stand-in for Electron's safeStorage: reversible, but never the plain text.
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from([...s].reverse().join(''), 'utf8'),
  decryptString: (b) => [...b.toString('utf8')].reverse().join(''),
};
const file = path.join(dir, 'config.json');

// Old single-provider config: the Claude key at the top level.
fs.writeFileSync(file, JSON.stringify({ apiKeyEnc: safeStorage.encryptString('sk-ant-old').toString('base64') }));
const store = createStore({ dir: () => dir, safeStorage });
assert.strictEqual(store.getSecret('anthropic'), 'sk-ant-old', 'old key not migrated');
const migrated = JSON.parse(fs.readFileSync(file, 'utf8'));
assert(!('apiKeyEnc' in migrated) && migrated.providers.anthropic.secret.enc, 'migration not written');

// Secrets are never stored in plain text when encryption is available.
store.setSecret('gemini', 'AIza-secret');
assert(!fs.readFileSync(file, 'utf8').includes('AIza-secret'));
assert.strictEqual(store.getSecret('gemini'), 'AIza-secret');
assert(store.hasSecret('gemini'));
store.setSecret('gemini', null);
assert(!store.hasSecret('gemini') && store.getSecret('gemini') === '');

// Without OS encryption: stored plainly (the UI warns), still readable.
const plainStore = createStore({ dir: () => dir, safeStorage: { isEncryptionAvailable: () => false } });
plainStore.setSecret('openrouter', 'sk-or-x');
assert.strictEqual(plainStore.getSecret('openrouter'), 'sk-or-x');
// An encrypted secret can't be read without encryption: treated as missing.
assert.strictEqual(plainStore.getSecret('anthropic'), '');

// Settings, active choice, stable host id.
store.setSetting('ollama', 'baseUrl', 'http://10.0.0.5:11434');
assert.strictEqual(store.getSetting('ollama', 'baseUrl'), 'http://10.0.0.5:11434');
store.setSetting('ollama', 'baseUrl', '');
assert.strictEqual(store.getSetting('ollama', 'baseUrl'), undefined);
store.setActive({ provider: 'gemini', model: 'gemini-2.5-pro' });
assert.deepStrictEqual(store.getActive(), { provider: 'gemini', model: 'gemini-2.5-pro' });
assert.strictEqual(store.getSetting('gemini', 'model'), 'gemini-2.5-pro', 'per-provider model not remembered');
const id = store.getHostId();
assert(/^urn:uuid:[0-9a-f-]{36}$/.test(id) && store.getHostId() === id);

// Corrupt file: starts fresh instead of crashing; no temp file left behind.
fs.writeFileSync(file, '{oops');
assert.strictEqual(store.getSecret('anthropic'), '');
store.setSecret('anthropic', 'k');
assert(!fs.existsSync(`${file}.tmp`));

console.log('credentials: all passed');
