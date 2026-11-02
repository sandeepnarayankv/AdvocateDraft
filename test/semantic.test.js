'use strict';
// Meaning-based search: rank fusion, the setting / download / cache flow, and
// (when a downloaded model is available) the real model in the worker.
//
// The real-model part runs only if ADVOCATE_DRAFT_MODEL_DIR points to a folder
// that already holds the model (it never downloads in tests).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fuseScores, selectContext, passagesToRank, renderContext } = require('../src/rag');
const { createSemantic } = require('../src/semantic');
const { createStore } = require('../src/credentials');
const embedder = require('../src/ocr/embedder');

// A long statement where the key passage uses different words from the facts.
const filler = Array.from({ length: 300 }, (_, i) => `Entry ${i + 1}: grocery purchase at store ${i % 37}, card payment, routine household expense.`);
const KEY = 'Entry X: the lessee handed over an advance amount of two lakh seventy thousand to the lessor on 10 March 2023.';
filler.splice(150, 0, KEY);
const statement = { name: 'Statement.pdf', text: filler.join('\n\n') };
const facts = 'Tenant paid a security deposit to the landlord which was not refunded after vacating.';

(async () => {
  // 1. Fusion: ranks, not raw scores, so either signal can lift a passage.
  const fused = fuseScores([5, 0, 0, 1], [0.1, 0.9, 0.2, 0.3]);
  assert(fused[0] > fused[2] && fused[1] > fused[2], 'top of either list should beat bottom of both');
  assert.strictEqual(fused.length, 4);
  // Ties share a rank: an uninformative signal (all equal) changes nothing.
  const tied = fuseScores([0, 0, 0, 0], [0.1, 0.4, 0.3, 0.2]);
  assert.deepStrictEqual(tied.map((_, i) => i).sort((a, b) => tied[b] - tied[a]), [1, 2, 3, 0]);

  // 2. Keyword-only misses the "advance" passage; with a meaning score it is picked.
  const budget = 6000;
  const passages = passagesToRank([statement], { budgetChars: budget });
  assert(passages.length > 10, 'statement should need ranking');
  assert.deepStrictEqual(passagesToRank([{ name: 'a', text: 'short' }], { budgetChars: budget }), [], 'nothing to rank when it fits');
  let ctx = selectContext([statement], facts, { budgetChars: budget });
  assert.strictEqual(ctx.stats.method, 'keyword');
  assert(!renderContext(ctx).includes('advance amount'), 'keyword search should miss it (different words)');
  const meaning = (t) => (t.includes('advance amount') ? 0.9 : 0.2);
  ctx = selectContext([statement], facts, { budgetChars: budget, meaningScore: meaning });
  assert.strictEqual(ctx.stats.method, 'keyword + meaning');
  assert(renderContext(ctx).includes('advance amount'), 'meaning-based search should pick it');
  // An incomplete scorer falls back to keywords rather than guessing.
  ctx = selectContext([statement], facts, { budgetChars: budget, meaningScore: () => undefined });
  assert.strictEqual(ctx.stats.method, 'keyword');
  console.log('ok  fusion lifts a passage that keywords miss');

  // Windows: sentence-sized, nothing lost, Indian sentence ends respected.
  const { windows } = require('../src/semantic');
  const w = windows(passages[0]);
  assert(w.length > 2 && w.every((x) => x.length <= 600), 'windows should be sentence-sized');
  assert.strictEqual(w.join(' ').replace(/\s+/g, ''), passages[0].replace(/\s+/g, ''), 'windows must cover the passage');
  assert.deepStrictEqual(windows('ಮೊದಲ ವಾಕ್ಯ। ' + 'ಎ'.repeat(320) + '।'), ['ಮೊದಲ ವಾಕ್ಯ।', 'ಎ'.repeat(320) + '।']);

  // 3. Setting, one-time download, cache — with a stand-in model.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-sem-'));
  const store = createStore({ dir: () => dir, safeStorage: { isEncryptionAvailable: () => false } });
  const calls = { setup: 0, embedded: [] };
  const fakeOcr = {
    async setupEmbedder(cacheDir, onProgress) {
      calls.setup++;
      onProgress({ file: 'onnx/model_quantized.onnx', loaded: 50, total: 100 });
      const f = path.join(cacheDir, 'Xenova', 'multilingual-e5-small', 'onnx', 'model_quantized.onnx');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, 'model');
      return { ready: true };
    },
    async embed(_cacheDir, texts, kind) {
      calls.embedded.push(...texts.map((t) => `${kind}:${t.slice(0, 20)}`));
      // 2-d "meaning": deposit-like texts point one way, others the other.
      return texts.map((t) => (/deposit|advance/i.test(t) ? [1, 0] : [0, 1]));
    },
  };
  const sem = createSemantic({ ocr: fakeOcr, store, dataDir: () => dir });
  assert.deepStrictEqual(
    { enabled: sem.status().enabled, ready: sem.status().ready },
    { enabled: false, ready: false },
    'off and not downloaded by default'
  );
  assert.strictEqual(await sem.scorer(passages, facts), null, 'off means no meaning scores');
  const progress = [];
  let s = await sem.enable((p) => progress.push(p));
  assert(s.enabled && s.ready && calls.setup === 1 && progress[0].loaded === 50);
  s = await sem.enable();
  assert.strictEqual(calls.setup, 1, 'model must not be downloaded twice');

  let score = await sem.scorer(passages, facts);
  const keyPassage = passages.find((t) => t.includes('advance amount'));
  assert(score(keyPassage) > score(passages[0]), 'deposit-like passage should score higher');
  const firstRun = calls.embedded.filter((c) => c.startsWith('passage:')).length;
  score = await sem.scorer(passages, facts);
  const secondRun = calls.embedded.filter((c) => c.startsWith('passage:')).length;
  assert.strictEqual(secondRun, firstRun, 'passages should be embedded once per session (cache)');
  sem.disable();
  assert.strictEqual(await sem.scorer(passages, facts), null);
  console.log('ok  setting, one-time download, session cache');

  // 4. Real model in the background worker (only if already downloaded).
  const modelDir = process.env.ADVOCATE_DRAFT_MODEL_DIR;
  if (!modelDir || !embedder.isDownloaded(modelDir)) {
    console.log('skip real-model check (set ADVOCATE_DRAFT_MODEL_DIR to a folder with the downloaded model)');
  } else {
    const { createOcrService, nodeSpawner } = require('../src/ocr/service');
    const ocr = createOcrService({ spawn: nodeSpawner() });
    try {
      const realDir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-semreal-'));
      // Point the app's model folder at the existing download (no network).
      fs.symlinkSync(modelDir, path.join(realDir, 'models'), 'junction');
      const store2 = createStore({ dir: () => realDir, safeStorage: { isEncryptionAvailable: () => false } });
      store2.setSetting('semantic', 'enabled', true);
      const real = createSemantic({ ocr, store: store2, dataDir: () => realDir });
      const t0 = Date.now();
      const realScore = await real.scorer(passages, facts);
      const ms = Date.now() - t0;
      ctx = selectContext([statement], facts, { budgetChars: budget, meaningScore: realScore });
      assert.strictEqual(ctx.stats.method, 'keyword + meaning');
      assert(renderContext(ctx).includes('advance amount'), 'real model should pick the advance passage');
      // Indian-language passage about the deposit outranks grocery entries.
      const kn = 'ಬಾಡಿಗೆದಾರರು ಮನೆ ಖಾಲಿ ಮಾಡಿದ ನಂತರ ಮಾಲೀಕರು ಮುಂಗಡ ಹಣವನ್ನು ಹಿಂದಿರುಗಿಸಿಲ್ಲ.';
      const knScore = await real.scorer([kn, filler[0]], facts);
      assert(knScore(kn) > knScore(filler[0]), 'Kannada deposit passage should outrank a grocery entry');
      console.log(`ok  real model in the worker: ${passages.length} passages ranked in ${ms} ms, Kannada matched`);
    } finally {
      ocr.stop();
    }
  }

  console.log('semantic: all passed');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
