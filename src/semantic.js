'use strict';

// ---------------------------------------------------------------------------
// Meaning-based search (main-process side)
// ---------------------------------------------------------------------------
// Off until the advocate switches it on, which downloads the model once into
// the app's data folder. When on, long documents are ranked by keyword AND by
// meaning. Passage vectors are cached for the session so repeated drafts on
// the same documents are fast; nothing is written to disk except the model.

const crypto = require('crypto');
const path = require('path');
const { isDownloaded, MODEL } = require('./ocr/embedder');

const MAX_CACHED = 20000;
const QUERY_CHARS = 2000;

function createSemantic({ ocr, store, dataDir }) {
  const cacheDir = () => path.join(dataDir(), 'models');
  const vectors = new Map(); // sha1(text) -> unit vector
  const key = (t) => crypto.createHash('sha1').update(t).digest('base64');
  let downloading = null;

  function status() {
    return {
      enabled: store.getSetting('semantic', 'enabled') === true,
      ready: isDownloaded(cacheDir()),
      downloading: Boolean(downloading),
      model: MODEL,
    };
  }

  // Downloads the model if needed (onProgress({ file, loaded, total })), then turns it on.
  async function enable(onProgress = () => {}) {
    if (!isDownloaded(cacheDir())) {
      downloading = downloading || ocr.setupEmbedder(cacheDir(), onProgress).finally(() => (downloading = null));
      await downloading;
    }
    store.setSetting('semantic', 'enabled', true);
    return status();
  }

  function disable() {
    store.setSetting('semantic', 'enabled', null);
    return status();
  }

  // A meaningScore(text) function for the given passages, or null when the
  // feature is off, not ready, or there is nothing to rank.
  // Each passage is scored by its best-matching sentence-sized window: one
  // relevant line in a page of routine entries must not be diluted away.
  async function scorer(passages, query) {
    const s = status();
    if (!s.enabled || !s.ready || !passages.length || !String(query).trim()) return null;
    const unique = [...new Set(passages)];
    const windowsOf = new Map(unique.map((t) => [t, windows(t)]));
    const allWindows = [...new Set([...windowsOf.values()].flat())];
    const missing = allWindows.filter((w) => !vectors.has(key(w)));
    if (missing.length) {
      if (vectors.size + missing.length > MAX_CACHED) vectors.clear();
      const vecs = await ocr.embed(cacheDir(), missing, 'passage');
      missing.forEach((w, i) => vectors.set(key(w), vecs[i]));
    }
    const [q] = await ocr.embed(cacheDir(), [String(query).slice(0, QUERY_CHARS)], 'query');
    const scores = new Map(
      unique.map((t) => [t, Math.max(...windowsOf.get(t).map((w) => dot(q, vectors.get(key(w)))))])
    );
    return (text) => scores.get(text);
  }

  return { status, enable, disable, scorer };
}

// Sentence-sized windows of a passage (~WINDOW_CHARS), split at paragraph and
// sentence ends (including the Devanagari danda), merging short pieces.
const WINDOW_CHARS = 300;
function windows(text) {
  const pieces = String(text)
    .split(/\n\s*\n|(?<=[.!?।])\s+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const out = [];
  let buf = '';
  for (const p of pieces) {
    if (buf && buf.length + p.length + 1 > WINDOW_CHARS) {
      out.push(buf);
      buf = '';
    }
    buf = buf ? `${buf} ${p}` : p;
    while (buf.length > WINDOW_CHARS * 2) {
      out.push(buf.slice(0, WINDOW_CHARS * 2));
      buf = buf.slice(WINDOW_CHARS * 2);
    }
  }
  if (buf) out.push(buf);
  return out.length ? out : [String(text).slice(0, WINDOW_CHARS * 2)];
}

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

module.exports = { createSemantic, windows };
