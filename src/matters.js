'use strict';

// ---------------------------------------------------------------------------
// Saved matters
// ---------------------------------------------------------------------------
// One file per matter in <userData>/matters/, plus index.json listing titles
// and dates. Both are encrypted with the OS keychain (safeStorage) because
// they hold client facts and documents; if encryption is unavailable they are
// stored as plain JSON. Writes go through a temp file so a crash never leaves
// a half-written matter.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENC_PREFIX = 'ENC1:';
const ID_RE = /^[0-9a-f-]{36}$/;

function createMatterStore({ dir, safeStorage }) {
  const root = () => {
    const d = path.join(dir(), 'matters');
    fs.mkdirSync(d, { recursive: true });
    return d;
  };
  const fileFor = (id) => {
    if (!ID_RE.test(String(id))) throw new Error('Invalid matter id');
    return path.join(root(), `${id}.json`);
  };
  const indexFile = () => path.join(root(), 'index.json');

  function encode(obj) {
    const json = JSON.stringify(obj);
    return safeStorage.isEncryptionAvailable()
      ? ENC_PREFIX + safeStorage.encryptString(json).toString('base64')
      : json;
  }

  function decode(raw) {
    if (raw.startsWith(ENC_PREFIX)) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('This matter is encrypted and the OS keychain is unavailable.');
      return JSON.parse(safeStorage.decryptString(Buffer.from(raw.slice(ENC_PREFIX.length), 'base64')));
    }
    return JSON.parse(raw);
  }

  function writeAtomic(file, content) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, content, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, file);
  }

  function readIndex() {
    try {
      const idx = decode(fs.readFileSync(indexFile(), 'utf8'));
      return { matters: idx.matters || {}, lastOpened: idx.lastOpened || null };
    } catch {
      return rebuildIndex();
    }
  }

  // If the index is missing or unreadable, rebuild it from the matter files.
  function rebuildIndex() {
    const idx = { matters: {}, lastOpened: null };
    let names = [];
    try {
      names = fs.readdirSync(root()).filter((n) => /^[0-9a-f-]{36}\.json$/.test(n));
    } catch {
      // empty
    }
    for (const n of names) {
      try {
        const m = decode(fs.readFileSync(path.join(root(), n), 'utf8'));
        idx.matters[m.id] = { title: m.title, createdAt: m.createdAt, updatedAt: m.updatedAt };
      } catch {
        // unreadable matter: leave it out of the list
      }
    }
    if (names.length) writeAtomic(indexFile(), encode(idx));
    return idx;
  }

  const writeIndex = (idx) => writeAtomic(indexFile(), encode(idx));

  return {
    list() {
      const { matters } = readIndex();
      return Object.entries(matters)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },

    get(id) {
      const m = decode(fs.readFileSync(fileFor(id), 'utf8'));
      const idx = readIndex();
      idx.lastOpened = id;
      writeIndex(idx);
      return m;
    },

    // Creates the matter when it has no id yet. Returns its summary.
    save(matter) {
      const now = new Date().toISOString();
      const idx = readIndex();
      const id = matter.id && idx.matters[matter.id] ? matter.id : crypto.randomUUID();
      const prev = idx.matters[id];
      const title = String(matter.title || '').trim().slice(0, 200) || 'Untitled matter';
      const saved = { ...matter, id, title, createdAt: (prev && prev.createdAt) || now, updatedAt: now };
      writeAtomic(fileFor(id), encode(saved));
      idx.matters[id] = { title, createdAt: saved.createdAt, updatedAt: now };
      idx.lastOpened = id;
      writeIndex(idx);
      return { id, title, createdAt: saved.createdAt, updatedAt: now };
    },

    remove(id) {
      try {
        fs.unlinkSync(fileFor(id));
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      const idx = readIndex();
      delete idx.matters[id];
      if (idx.lastOpened === id) idx.lastOpened = null;
      writeIndex(idx);
    },

    lastOpened() {
      const { matters, lastOpened } = readIndex();
      return lastOpened && matters[lastOpened] ? lastOpened : null;
    },

    clearLastOpened() {
      const idx = readIndex();
      idx.lastOpened = null;
      writeIndex(idx);
    },
  };
}

module.exports = { createMatterStore };
