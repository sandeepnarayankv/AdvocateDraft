'use strict';
// Read with AI: scanned pages go to a vision model as images, one page at a
// time; text-layer pages keep their text; matters keep the link to the file.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { loadMain } = require('./helpers/harness');
const fx = require('./helpers/fixtures');
const P = require('../src/prompts');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-airead-'));
const write = (name, data) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, data);
  return p;
};

// Mock Ollama vision model: answers each page with what it "sees".
const requests = [];
let slow = false;
let rejectImages = false;
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    if (req.url === '/api/tags') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ models: [{ name: 'vision' }] }));
    }
    const body = JSON.parse(raw);
    requests.push(body);
    if (rejectImages) {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'this model does not support images' }));
    }
    const page = (body.messages[1].content.match(/page (\d+)/) || [])[1];
    const answer = `ಕೈಬರಹ ಪುಟ ${page}: Rs. 2,70,000 [signature]`;
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      res.write(JSON.stringify({ message: { content: answer }, done: false }) + '\n');
      res.end(JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 900, eval_count: 20 }) + '\n');
    }, slow ? 400 : 1);
  });
});

function windowStub() {
  const events = [];
  return {
    events,
    isDestroyed: () => false,
    send: (ch, msg) => events.push({ ch, msg }),
    async done(jobId) {
      for (let i = 0; i < 1200; i++) {
        const e = events.find((x) => x.ch === 'files:done' && x.msg.jobId === jobId);
        if (e) return e.msg.result;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error('reading did not finish');
    },
  };
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const mixed = write('Mixed.pdf', await fx.mixedPdf());
  const scan3 = write('Handwritten 3 pages.pdf', await fx.scannedPdf(3));
  const photo = write('Receipt photo.png', fx.scannedImage(['RECEIVED Rs. 5,000']));
  let picks = [];
  const { handlers, call } = await loadMain({ pickFiles: () => picks });
  await call('providers:setBaseUrl', { id: 'ollama', baseUrl: `http://127.0.0.1:${server.address().port}` });

  const add = async (p) => {
    picks = [p];
    const w = windowStub();
    const [entry] = await handlers['files:pick']({ sender: w }, 'documents');
    return w.done(entry.jobId);
  };
  const aiRead = async (sourceId, extra = {}) => {
    const w = windowStub();
    const res = await handlers['aiRead:run']({ sender: w }, { sourceId, provider: 'ollama', model: 'vision', ...extra });
    return { res, progress: w.events.filter((e) => e.ch === 'aiRead:progress').map((e) => e.msg) };
  };

  // 1. Mixed PDF: only the scanned page is sent; the text page keeps its text.
  const mixedDoc = await add(mixed);
  assert(mixedDoc.sourceId, 'readable PDFs should carry a source id');
  let { res, progress } = await aiRead(mixedDoc.sourceId);
  assert(res.ok, res.error);
  assert.strictEqual(res.pages, 2);
  assert.strictEqual(res.aiPages, 1, 'only the scanned page should go to the AI');
  assert.strictEqual(requests.length, 1);
  assert(/LEASE AGREEMENT dated 12 March 2023/.test(res.text) && /ಕೈಬರಹ ಪುಟ 2: Rs\. 2,70,000 \[signature\]/.test(res.text), res.text);
  assert(res.text.indexOf('LEASE') < res.text.indexOf('ಕೈಬರಹ'), 'pages out of order');
  const req = requests[0];
  assert.strictEqual(req.messages[0].content, P.DEFAULTS.handwriting, 'handwriting prompt not used');
  assert.strictEqual(req.messages[1].images.length, 1);
  assert.strictEqual(Buffer.from(req.messages[1].images[0], 'base64')[0], 0xff, 'image should be a JPEG');
  assert.deepStrictEqual(progress.map((p) => p.stage + (p.page ? `${p.page}/${p.total}` : '')), ['preparing', 'reading1/1']);
  console.log('ok  mixed PDF: text page kept, scanned page read by AI');

  // 2. Three handwritten pages: one request per page, in order.
  requests.length = 0;
  const scanDoc = await add(scan3);
  ({ res, progress } = await aiRead(scanDoc.sourceId));
  assert(res.ok && res.aiPages === 3 && requests.length === 3);
  // Each page is requested in order, naming the languages of the "Scans in" setting.
  assert.deepStrictEqual(
    requests.map((r) => r.messages[1].content),
    [1, 2, 3].map((n) => `Transcribe page ${n} of the document. Expected languages: English and Hindi.`)
  );
  assert.deepStrictEqual(progress.filter((p) => p.page).map((p) => `${p.page}/${p.total}`), ['1/3', '2/3', '3/3']);
  console.log('ok  one request per page with progress');

  // 3. Photo of a document.
  requests.length = 0;
  const photoDoc = await add(photo);
  ({ res } = await aiRead(photoDoc.sourceId));
  assert(res.ok && res.aiPages === 1 && requests.length === 1);
  console.log('ok  photo read by AI');

  // 4. Stop part-way.
  slow = true;
  requests.length = 0;
  const pending = aiRead(scanDoc.sourceId);
  for (let i = 0; i < 200 && !requests.length; i++) await new Promise((r) => setTimeout(r, 25));
  const busy = await handlers['aiRead:run']({ sender: windowStub() }, { sourceId: photoDoc.sourceId, provider: 'ollama', model: 'vision' });
  assert(!busy.ok && /already being read/.test(busy.error));
  await handlers['aiRead:cancel']();
  ({ res } = await pending);
  assert(!res.ok && res.cancelled, JSON.stringify(res));
  assert(requests.length < 3, `stop did not stop (${requests.length} pages sent)`);
  slow = false;
  console.log(`ok  stop after ${requests.length} page(s)`);

  // 5. A model that cannot take images: clear advice.
  rejectImages = true;
  ({ res } = await aiRead(photoDoc.sourceId));
  assert(!res.ok && /may not accept images|support images/.test(res.error), res.error);
  rejectImages = false;

  // 6a. Safeguards: the mock answers in Kannada. With English + Hindi selected,
  //     that script is flagged; with an OCR text that read the line
  //     differently, the disagreement is reported with both versions.
  ({ res } = await aiRead(photoDoc.sourceId));
  assert.deepStrictEqual(res.strayScripts, ['Kannada'], 'unexpected script should be flagged');
  ({ res } = await aiRead(photoDoc.sourceId, { previousText: 'RECEIVED Rs. 5,000\nಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ ಪುಟ' }));
  assert(res.ok && res.ocrMismatch.length === 1 && res.ocrMismatch[0].script === 'Kannada', JSON.stringify(res.ocrMismatch));
  assert(res.ocrMismatch[0].ocr.includes('ಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ') && res.ocrMismatch[0].ai.includes('ಕೈಬರಹ'));
  await call('ocr:setLangs', ['eng', 'kan']);
  ({ res } = await aiRead(photoDoc.sourceId));
  assert.deepStrictEqual(res.strayScripts, [], 'Kannada is expected once selected');
  await call('ocr:setLangs', ['eng', 'hin']);
  console.log('ok  script check and OCR cross-check');

  // 6. Unknown / missing file.
  ({ res } = await aiRead('s999'));
  assert(!res.ok && /no longer available/.test(res.error));
  console.log('ok  errors');

  // 7. Saved matters keep the link: the file can be read with AI after reopening.
  const saved = await call('matters:save', {
    title: 'Handwritten matter',
    documents: [{ name: 'Mixed.pdf', text: mixedDoc.text, ok: true, sourceId: mixedDoc.sourceId, ocrPages: 1 }],
    references: [],
  });
  const opened = await call('matters:open', saved.id);
  const reopenedDoc = opened.matter.documents[0];
  assert(reopenedDoc.sourceId && !('sourcePath' in reopenedDoc), 'path must not reach the window');
  ({ res } = await aiRead(reopenedDoc.sourceId));
  assert(res.ok && res.aiPages === 1, res.error);
  console.log('ok  link to the original file survives saving and reopening');

  // 8. Documents transcribed by AI are labelled in the drafting prompt.
  const pv = await call('prompts:preview', {
    template: '', references: [], facts: 'f', budgetChars: 80000, includeNotes: false,
    documents: [{ name: 'Diary.pdf', text: 'x', aiPages: 2 }],
  });
  assert(pv.user.includes('Diary.pdf (handwritten / scanned — transcribed by AI'), 'AI label missing');

  // The handwriting prompt is editable.
  assert((await call('prompts:get')).some((s) => s.key === 'handwriting'));

  console.log('ai-read: all passed');
  server.close();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
