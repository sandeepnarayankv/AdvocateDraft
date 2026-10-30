'use strict';
// Adding files through the real main process: PDFs and scans are read in the
// background worker with progress events; other files are read immediately.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadMain } = require('./helpers/harness');
const fx = require('./helpers/fixtures');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-reading-'));
const write = (name, data) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, data);
  return p;
};

// A window stand-in that records reading events.
function windowStub() {
  const events = [];
  const waiters = [];
  return {
    events,
    isDestroyed: () => false,
    send(ch, msg) {
      events.push({ ch, msg });
      waiters.splice(0).forEach((w) => w());
    },
    async doneFor(jobId, timeoutMs = 60000) {
      const t0 = Date.now();
      for (;;) {
        const e = events.find((x) => x.ch === 'files:done' && x.msg.jobId === jobId);
        if (e) return e.msg;
        if (Date.now() - t0 > timeoutMs) throw new Error(`no result for job ${jobId}`);
        await new Promise((r) => {
          waiters.push(r);
          setTimeout(r, 500);
        });
      }
    },
  };
}

(async () => {
  const scanned = write('Scanned notice.pdf', await fx.scannedPdf(2));
  const textPdf = write('Lease.pdf', await fx.textPdf(['LEASE AGREEMENT dated 12 March 2023', 'Rent Rs. 45,000 per month']));
  const photo = write('Photo of receipt.png', fx.scannedImage(['RECEIPT', 'Received Rs. 2,70,000 from Priya Shetty']));
  const notes = write('Notes.txt', 'Client met on 3 March.');
  const broken = write('Broken.pdf', 'this is not really a pdf');

  let picks = [];
  const { call, handlers } = await loadMain({ pickFiles: () => picks });
  const pick = async (paths, kind = 'documents') => {
    picks = paths;
    const sender = windowStub();
    const entries = await handlers['files:pick']({ sender }, kind);
    return { entries, sender };
  };

  // 1. Mixed selection: text file immediately; PDFs and images pending.
  let { entries, sender } = await pick([notes, textPdf, scanned, photo]);
  assert.strictEqual(entries[0].ok, true);
  assert.strictEqual(entries[0].text, 'Client met on 3 March.');
  for (const e of entries.slice(1)) assert(e.pending && e.jobId, `${e.name} should be pending`);

  const [lease, scan, img] = await Promise.all(entries.slice(1).map((e) => sender.doneFor(e.jobId)));
  assert(lease.result.ok && lease.result.ocrPages === 0 && /LEASE AGREEMENT/.test(lease.result.text), JSON.stringify(lease));
  assert(scan.result.ok && scan.result.ocrPages === 2 && scan.result.pages === 2, JSON.stringify(scan.result));
  assert(/2,70,000/.test(scan.result.text) && scan.result.confidence >= 70, scan.result.text);
  assert(img.result.ok && /RECEIPT/.test(img.result.text) && img.result.ocrPages === 1);
  const progress = sender.events.filter((e) => e.ch === 'files:progress' && e.msg.jobId === entries[2].jobId);
  assert.deepStrictEqual(progress.map((e) => `${e.msg.page}/${e.msg.total}:${e.msg.ocr}`), ['1/2:true', '2/2:true']);
  console.log(`ok  text read now; PDF, scan (OCR ${scan.result.confidence}%) and photo read in background with progress`);

  // 2. Cancel a long scan.
  const longScan = write('Long scan.pdf', await fx.scannedPdf(6));
  ({ entries, sender } = await pick([longScan]));
  const jobId = entries[0].jobId;
  for (let i = 0; i < 200 && !sender.events.some((e) => e.ch === 'files:progress'); i++) await new Promise((r) => setTimeout(r, 50));
  await handlers['files:cancel']({}, jobId);
  const cancelled = await sender.doneFor(jobId);
  assert.strictEqual(cancelled.cancelled, true);
  const pagesRead = sender.events.filter((e) => e.ch === 'files:progress').length;
  assert(pagesRead < 6, `cancel did not stop reading (${pagesRead} pages)`);
  console.log(`ok  cancel stopped after ${pagesRead} of 6 pages`);

  // 3. An unreadable PDF reports an error instead of hanging.
  ({ entries, sender } = await pick([broken]));
  const bad = await sender.doneFor(entries[0].jobId);
  assert(bad.result && bad.result.ok === false && bad.result.error, JSON.stringify(bad));
  console.log('ok  unreadable PDF reported:', bad.result.error.slice(0, 60));

  // 4. Scans can be used as previous documents too.
  ({ entries, sender } = await pick([scanned], 'precedent'));
  const ref = await sender.doneFor(entries[0].jobId);
  assert(ref.result.ok && ref.result.ocrPages === 2);

  // 5. Language setting: defaults to English + Hindi; unknown codes dropped.
  let s = await call('ocr:settings');
  assert.deepStrictEqual(s.langs, ['eng', 'hin']);
  assert(s.languages.kan === 'Kannada');
  s = await call('ocr:setLangs', ['eng', 'kan', 'bogus']);
  assert.deepStrictEqual(s.langs, ['eng', 'kan']);
  ({ entries, sender } = await pick([photo]));
  assert((await sender.doneFor(entries[0].jobId)).result.ok, 'English + Kannada reading failed');
  console.log('ok  OCR language setting');

  // 6. The prompt tells the model which documents came from OCR.
  const pv = await call('prompts:preview', {
    template: '', references: [], facts: 'f', budgetChars: 80000, includeNotes: false,
    documents: [scan.result, lease.result],
  });
  assert(pv.user.includes('Scanned notice.pdf (scanned — text read by OCR'), 'OCR label missing');
  assert(!pv.user.includes('Lease.pdf (scanned'), 'text PDF wrongly labelled');
  console.log('ok  OCR documents labelled in the prompt');

  console.log('reading: all passed');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
