'use strict';
// Drives the real src/main.js IPC handlers against a mock Anthropic streaming
// server, with Electron replaced by a small stand-in. No API key or network.
const assert = require('assert');
const http = require('http');
const { loadMain, fakeSender } = require('./helpers/harness');

// ---- mock Anthropic streaming endpoint ------------------------------------
let mode = 'normal'; // 'normal' | 'slow' | 'error'
let reply = null; // pieces to stream in normal mode
let lastBody = null;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    lastBody = JSON.parse(body);
    if (mode === 'error') {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`);
    send('message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: lastBody.model, content: [], stop_reason: null, usage: { input_tokens: 1234, output_tokens: 0 } } });
    send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    const pieces = mode === 'slow' ? Array.from({ length: 50 }, (_, i) => `Para ${i + 1}. `) : reply;
    let i = 0;
    const tick = () => {
      if (res.destroyed) return;
      if (i < pieces.length) {
        send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: pieces[i++] } });
        setTimeout(tick, mode === 'slow' ? 40 : 2);
        return;
      }
      send('content_block_stop', { index: 0 });
      send('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 42 } });
      send('message_stop', {});
      res.end();
    };
    tick();
  });
});

const payload = {
  provider: 'anthropic',
  template: 'Plaint format',
  references: [],
  facts: 'Security deposit of Rs. 2,70,000 not refunded by Ramesh Kumar.',
  documents: [{ name: 'Lease.pdf', text: 'Lease dated 12 March 2023. Deposit Rs. 2,70,000.' }],
  model: 'claude-sonnet-5-5',
  maxTokens: 1000,
  budgetChars: 400000,
  includeNotes: true,
};

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const { handlers, call } = await loadMain();

  // Without a key, generation explains what to do.
  let res = await handlers['draft:generate']({ sender: fakeSender() }, payload);
  assert(!res.ok && /Add your Claude \(Anthropic\) API key/.test(res.error), res.error);
  await call('providers:setKey', { id: 'anthropic', key: 'sk-ant-test-key' });

  // 1. Normal stream: deltas arrive in order and match the final text.
  mode = 'normal';
  reply = ['IN THE COURT OF ', 'THE CIVIL JUDGE\n', 'Plaint under Order VII.'];
  let s = fakeSender();
  res = await handlers['draft:generate']({ sender: s }, payload);
  assert(res.ok, `generate failed: ${res.error}`);
  assert.strictEqual(s.deltas.join(''), res.text);
  assert.deepStrictEqual(s.deltas, reply);
  assert.strictEqual(res.stopReason, 'end');
  assert.strictEqual(res.provider, 'anthropic');
  assert(lastBody.stream === true, 'request was not streamed');
  assert(lastBody.system.includes('SOURCE NOTES'), 'notes instruction missing');
  assert(lastBody.messages[0].content.includes('[D1-P1]'), 'passage tags missing');
  assert.deepStrictEqual(res.carryOver, [], 'no previous document, nothing to flag');

  // 2. Stop mid-stream.
  mode = 'slow';
  s = fakeSender();
  const p = handlers['draft:generate']({ sender: s }, payload);
  // Stop once text is flowing; a fixed delay is flaky on a busy machine.
  for (let i = 0; i < 200 && s.deltas.length < 2; i++) await new Promise((r) => setTimeout(r, 50));
  const busy = await handlers['draft:generate']({ sender: fakeSender() }, payload);
  assert(!busy.ok && /already/.test(busy.error), 'concurrent generation not blocked');
  assert((await handlers['draft:cancel']()).ok);
  res = await p;
  assert(!res.ok && res.cancelled, JSON.stringify(res));
  assert(s.deltas.length > 0 && s.deltas.length < 50, `partial deltas: ${s.deltas.length}`);

  // 3. API error: plain message, state released.
  mode = 'error';
  res = await handlers['draft:generate']({ sender: fakeSender() }, payload);
  assert(!res.ok && !res.cancelled && /Claude rejected the API key/.test(res.error), JSON.stringify(res));

  // 4. Custom prompts: saved edits are what actually gets sent.
  let sections = await handlers['prompts:get']();
  assert(sections.every((x) => !x.custom));
  sections = await handlers['prompts:save']({}, { core: 'CUSTOM CORE RULES', task: 'CUSTOM TASK LINE' });
  assert(sections.find((x) => x.key === 'core').custom);
  mode = 'normal';
  reply = ['ok'];
  res = await handlers['draft:generate']({ sender: fakeSender() }, payload);
  assert(res.ok);
  assert(lastBody.system.startsWith('CUSTOM CORE RULES'), 'saved core prompt not sent');
  assert(lastBody.messages[0].content.endsWith('CUSTOM TASK LINE'), 'saved task line not sent');

  // 5. Preview matches what Generate sends, and shows unsaved edits on request.
  let pv = await handlers['prompts:preview']({}, payload);
  assert.strictEqual(pv.system, lastBody.system);
  assert.strictEqual(pv.user, lastBody.messages[0].content);
  pv = await handlers['prompts:preview']({}, { ...payload, promptOverrides: { core: 'UNSAVED EDIT' } });
  assert(pv.system.startsWith('UNSAVED EDIT'));
  // Reset to defaults by saving them back.
  sections = await handlers['prompts:save']({}, Object.fromEntries(sections.map((x) => [x.key, x.default])));
  assert(sections.every((x) => !x.custom));

  // 6. Previous document: kept separate in the prompt, and leaked facts flagged.
  const withPrecedent = {
    ...payload,
    references: [
      { name: 'Old plaint.docx', role: 'precedent', text: 'Plaintiff Suresh Hegde of Jayanagar paid Rs. 3,50,000 on 14.06.2021.' },
      { name: 'Format.docx', role: 'template', text: 'PLAINT\n1. Parties: [ ]\nPRAYER' },
    ],
  };
  reply = ['PLAINT\n1. Ramesh Kumar retained Rs. 2,70,000 and also Rs. 3,50,000 paid by Suresh Hegde.\nPRAYER'];
  res = await handlers['draft:generate']({ sender: fakeSender() }, withPrecedent);
  assert(res.ok, res.error);
  const sent = lastBody.messages[0].content;
  assert(sent.includes('<previous_document name="Old plaint.docx">'));
  assert(sent.includes('<template name="Format.docx">'));
  assert(lastBody.system.includes('<previous_document> was drafted for a DIFFERENT matter'));
  assert(lastBody.system.includes('follow the template'));
  const flagged = res.carryOver.map((c) => c.value);
  assert(flagged.includes('Suresh Hegde') && flagged.includes('3,50,000'), `flagged: ${flagged}`);
  assert(!flagged.some((v) => /Ramesh|Kumar|2,70,000/.test(v)), `false positive: ${flagged}`);

  // 7. Claude receives page images as image content blocks before the text.
  reply = ['ok'];
  const img = { mediaType: 'image/jpeg', data: Buffer.from('fake').toString('base64') };
  await require('../src/providers/anthropic').stream({
    secret: 'sk-ant-test-key', model: 'claude-sonnet-5-5', system: 'S', user: 'Transcribe page 1',
    images: [img], maxTokens: 100, signal: new AbortController().signal, onText: () => {},
  });
  assert.deepStrictEqual(lastBody.messages[0].content, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.data } },
    { type: 'text', text: 'Transcribe page 1' },
  ]);

  console.log('app: all passed');
  server.close();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
