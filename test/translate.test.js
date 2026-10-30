'use strict';
// Document translation: splitting, prompts, streaming through a provider,
// stop, errors, and the filing version with certificate.
const assert = require('assert');
const http = require('http');
const T = require('../src/translate');
const P = require('../src/prompts');
const { loadMain } = require('./helpers/harness');

// ---- helpers ---------------------------------------------------------------
// Splitting keeps paragraphs whole and stays within the part size.
const paras = Array.from({ length: 30 }, (_, i) => (`${i + 1}. ಪ್ಯಾರಾ ${i + 1}: ` + 'ಸಾಕ್ಷಿ ಹೇಳಿಕೆ. '.repeat(25)).trim());
const doc = paras.join('\n\n');
const parts = T.splitForTranslation(doc, 2000);
assert(parts.length > 1, 'long document should be split');
assert(parts.every((p) => p.length <= 2000), 'part too long');
assert.strictEqual(parts.join('\n\n'), doc, 'splitting must not lose or reorder text');
assert(parts.every((p) => /^\d+\. /.test(p)), 'parts should start at paragraph boundaries');
// A single huge paragraph is cut at sentence ends (। for Indian scripts).
const huge = 'वाक्य एक है। '.repeat(1000);
const hp = T.splitForTranslation(huge, 1500);
assert(hp.length > 1 && hp.every((p) => p.length <= 1500) && hp.slice(0, -1).every((p) => p.endsWith('।')));
assert.deepStrictEqual(T.splitForTranslation('short'), ['short']);

// Prompt: languages filled in; auto-detect worded sensibly.
const tpl = P.DEFAULTS.translate;
let sys = T.translationSystemPrompt(tpl, { source: 'kan', target: 'eng' });
assert(sys.includes('from Kannada into English') && !sys.includes('{'));
sys = T.translationSystemPrompt(tpl, { source: 'auto', target: 'eng' });
assert(sys.includes('from its original language (identify it yourself) into English'));
assert(/Reproduce names/.test(tpl) && /\[illegible\]/.test(tpl), 'key rules missing');
assert(T.translationUserPrompt({ name: 'FIR.pdf', text: 'x', part: 2, total: 3 }).includes('This is part 2 of 3'));
assert(!T.translationUserPrompt({ name: 'FIR.pdf', text: 'x', part: 1, total: 1 }).includes('part'));

// Filing version: heading, text, certificate with both languages.
const filed = T.translationForFiling({ name: 'FIR copy.pdf', source: 'kan', target: 'eng', text: 'Translated text.' });
assert(filed.startsWith('ENGLISH TRANSLATION OF FIR COPY\n(Original in Kannada)'));
assert(filed.includes('true and correct English translation of the original document in Kannada'));
assert(filed.includes('[SIGNATURE OF TRANSLATOR]'));
assert(T.translationForFiling({ name: 'a.pdf', source: 'auto', target: 'eng', text: 't' }).includes('in [ORIGINAL LANGUAGE]'));
console.log('ok  splitting, prompts and filing text');

// ---- end to end through the main process with a mock (Ollama) provider ------
const seen = [];
let slow = false;
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    if (req.url === '/api/tags') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ models: [{ name: 'm' }] }));
    }
    const body = JSON.parse(raw);
    seen.push(body);
    const user = body.messages[1].content;
    const part = (user.match(/This is part (\d+) of/) || [, '1'])[1];
    res.writeHead(200, { 'content-type': 'application/x-ndjson' });
    const pieces = [`[EN part ${part}] `, 'translated ', 'text.'];
    let i = 0;
    const tick = () => {
      if (res.destroyed) return;
      if (i < pieces.length) {
        res.write(JSON.stringify({ message: { content: pieces[i++] }, done: false }) + '\n');
        setTimeout(tick, slow ? 300 : 1);
      } else {
        res.end(JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 10, eval_count: 3 }) + '\n');
      }
    };
    tick();
  });
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { handlers, call } = await loadMain();
  await call('providers:setBaseUrl', { id: 'ollama', baseUrl: `http://127.0.0.1:${server.address().port}` });

  const events = [];
  const sender = { isDestroyed: () => false, send: (ch, m) => events.push({ ch, m }) };
  const longDoc = Array.from({ length: 14 }, (_, i) => `${i + 1}. ` + 'ಮೊದಲ ವರ್ತಮಾನ ವರದಿ ಪಠ್ಯ. '.repeat(40)).join('\n\n');
  const expectedParts = T.splitForTranslation(longDoc).length;
  assert(expectedParts >= 2, 'fixture should need several parts');

  let res = await handlers['translate:run']({ sender }, { name: 'FIR.pdf', text: longDoc, source: 'kan', target: 'eng', provider: 'ollama', model: 'm' });
  assert(res.ok, res.error);
  assert.strictEqual(res.parts, expectedParts);
  assert(res.text.startsWith('[EN part 1] translated text.') && res.text.includes(`[EN part ${expectedParts}]`));
  const progress = events.filter((e) => e.ch === 'translate:progress').map((e) => `${e.m.part}/${e.m.total}`);
  assert.deepStrictEqual(progress, Array.from({ length: expectedParts }, (_, i) => `${i + 1}/${expectedParts}`));
  const streamed = events.filter((e) => e.ch === 'translate:delta').map((e) => e.m).join('');
  assert.strictEqual(streamed.trim(), res.text, 'streamed text should match the result');
  assert(seen[0].messages[0].content.includes('from Kannada into English'), 'system prompt languages');
  assert(seen[0].messages[1].content.includes('Document: FIR.pdf'));
  console.log(`ok  translated in ${expectedParts} parts with progress and streaming`);

  // An edited "Translation instructions" prompt is what gets sent.
  await call('prompts:save', { translate: 'CUSTOM TRANSLATION RULES from {source} to {target}.' });
  seen.length = 0;
  await handlers['translate:run']({ sender }, { name: 'a', text: 'ಪಠ್ಯ', source: 'kan', target: 'eng', provider: 'ollama', model: 'm' });
  assert.strictEqual(seen[0].messages[0].content, 'CUSTOM TRANSLATION RULES from Kannada to English.');
  await call('prompts:save', {});
  console.log('ok  edited translation prompt used');

  // Stop keeps what was translated so far.
  slow = true;
  const p = handlers['translate:run']({ sender }, { name: 'FIR.pdf', text: longDoc, source: 'kan', target: 'eng', provider: 'ollama', model: 'm' });
  await new Promise((r) => setTimeout(r, 450));
  const busy = await handlers['translate:run']({ sender }, { name: 'x', text: 'y', source: 'kan', target: 'eng', provider: 'ollama', model: 'm' });
  assert(!busy.ok && /already running/.test(busy.error), 'second translation should be refused');
  assert((await handlers['translate:cancel']()).ok);
  res = await p;
  assert(!res.ok && res.cancelled, JSON.stringify(res));
  slow = false;
  console.log('ok  stop');

  // Errors: no text; provider not set up.
  res = await handlers['translate:run']({ sender }, { name: 'a', text: '  ', source: 'kan', target: 'eng', provider: 'ollama', model: 'm' });
  assert(!res.ok && /no text to translate/.test(res.error));
  res = await handlers['translate:run']({ sender }, { name: 'a', text: 'x', source: 'kan', target: 'eng', provider: 'gemini', model: 'g' });
  assert(!res.ok && /Add your Gemini \(Google\) API key/.test(res.error), res.error);
  console.log('ok  errors');

  // A document uploaded only for translation ("Not in draft") never reaches the drafting prompt.
  const pv = await call('prompts:preview', {
    template: '', references: [], facts: 'f', budgetChars: 80000, includeNotes: false,
    documents: [
      { name: 'Used.pdf', text: 'USED TEXT' },
      { name: 'Translate only.pdf', text: 'SECRET TRANSLATE-ONLY TEXT', useInDraft: false },
    ],
  });
  assert(pv.user.includes('USED TEXT') && !pv.user.includes('TRANSLATE-ONLY') && !pv.user.includes('Translate only.pdf'));
  console.log('ok  "Not in draft" documents are left out of drafting');

  // The translation prompt appears in the prompt editor.
  const sections = await call('prompts:get');
  assert(sections.some((s) => s.key === 'translate' && /Translation/.test(s.label)));

  console.log('translate: all passed');
  server.close();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
