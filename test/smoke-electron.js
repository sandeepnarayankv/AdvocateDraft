'use strict';
// Starts the real app inside Electron with a throwaway data folder, runs
// checks in the window, prints a JSON report and exits (0 = passed).
// Usage: npm run smoke

const { app, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fx = require('./helpers/fixtures');

// Never touch the advocate's real settings, keys or matters.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-smoke-'));
app.setPath('userData', tmp);

// "Add files…" picks a scanned PDF created for the test.
const scanPath = path.join(tmp, 'Scanned notice.pdf');
const scanReady = fx.scannedPdf(2).then((buf) => fs.writeFileSync(scanPath, buf));
dialog.showOpenDialog = async () => {
  await scanReady;
  return { canceled: false, filePaths: [scanPath] };
};

// A stand-in local AI (Ollama API) for the translation check.
const http = require('http');
const mockAi = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'mock-model' }] }));
    const lines = ['ಕಾನೂನು ', 'ನೋಟಿಸ್'].map((t) => JSON.stringify({ message: { content: t }, done: false }));
    lines.push(JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 5, eval_count: 2 }));
    res.end(lines.join('\n') + '\n');
  });
});
const mockAiReady = new Promise((r) => mockAi.listen(0, '127.0.0.1', r));
process.env.SMOKE_MOCK_AI = '';
mockAiReady.then(() => (process.env.SMOKE_MOCK_AI = `http://127.0.0.1:${mockAi.address().port}`));

const problems = [];
const finish = (report) => {
  const ok = problems.length === 0 && report.ok !== false;
  console.log(`SMOKE ${ok ? 'PASSED' : 'FAILED'}`);
  console.log(JSON.stringify({ ...report, problems }, null, 2));
  app.exit(ok ? 0 : 1);
};
// The checks include OCR and AI reading, so allow a few minutes on a busy machine.
setTimeout(() => {
  problems.push('timed out after 180s');
  finish({ ok: false });
}, 180000).unref();

// Checks run in the page, using only what the window itself can use.
const PAGE_CHECKS = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 50 && !document.querySelectorAll('#provider option').length; i++) await wait(100);
  // Click by selector; a missing element is reported by name.
  const clickSel = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('missing element ' + sel + ' — documents: ' +
      [...document.querySelectorAll('#docList li')].map((li) => li.textContent.replace(/\\s+/g, ' ').trim()).join(' / '));
    el.click();
  };
  const out = {
    electron: navigator.userAgent.match(/Electron\\/([\\d.]+)/)?.[1],
    isolated: typeof window.require === 'undefined' && typeof window.process === 'undefined',
    providers: [...document.querySelectorAll('#provider option')].map((o) => o.value),
    selected: document.getElementById('provider').value,
  };
  const p = await window.api.prompts.preview({ template: 'Legal notice', references: [], facts: 'Facts here', documents: [], budgetChars: 80000, includeNotes: true });
  out.preview = { chars: p.chars, hasNotesMarker: p.system.includes('SOURCE NOTES'), endsWithTask: /## TASK/.test(p.user) };
  const sections = await window.api.prompts.get();
  out.promptSections = sections.length;
  const ollama = await window.api.providers.models('ollama');
  out.ollama = ollama.ok ? ollama.models.length + ' model(s)' : 'not running: ' + ollama.error;
  document.getElementById('settingsBtn').click();
  await wait(300);
  out.providerCards = document.querySelectorAll('.pcard').length;
  document.getElementById('closeSettings').click();
  document.getElementById('promptsBtn').click();
  await wait(300);
  out.promptEditorSections = document.querySelectorAll('.psec').length;
  document.getElementById('closePrompts').click();

  // Matters: autosave, new, reopen.
  const type = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); };
  type('matterTitle', 'Smoke v. Test');
  type('facts', 'Smoke facts: deposit Rs. 1,000 not refunded.');
  await wait(1600);
  out.autosave = document.getElementById('saveState').textContent;
  document.getElementById('newMatter').click();
  await wait(400);
  out.afterNew = { facts: document.getElementById('facts').value, title: document.getElementById('matterTitle').value };
  document.getElementById('openMatter').click();
  await wait(400);
  out.listed = [...document.querySelectorAll('#matterList .mt')].map((e) => e.textContent);
  clickSel('#matterList .open');
  await wait(400);
  out.reopened = { facts: document.getElementById('facts').value, title: document.getElementById('matterTitle').value };

  // Built-in formats: pick the Magistrate bail format in a fresh matter.
  document.getElementById('newMatter').click();
  await wait(300);
  document.getElementById('chooseFormat').click();
  await wait(400);
  out.formatCount = document.querySelectorAll('#formatList li[data-id]').length;
  clickSel('#formatCats button[data-cat="Criminal"]');
  await wait(100);
  out.criminalCount = document.querySelectorAll('#formatList li[data-id]').length;
  clickSel('#formatList li[data-id="crim-bail-magistrate"]');
  await wait(400);
  out.detailHasLaw = document.getElementById('formatDetail').textContent.includes('Section 480 BNSS');
  document.getElementById('useFormat').click();
  await wait(400);
  out.formatUsed = {
    refs: [...document.querySelectorAll('#refList .doc-name')].map((e) => e.textContent),
    factsPrefilled: document.getElementById('facts').value.split('\\n')[0],
    instructions: document.getElementById('template').value.slice(0, 40),
    checklistShown: !document.getElementById('formatChecklist').hidden,
    checklistHasAnnexures: document.getElementById('formatChecklist').textContent.includes('Copy of the FIR'),
  };
  type('matterTitle', 'Smoke bail matter');

  // Scanned PDF: read in Electron's background process, with progress.
  out.ocrLangOptions = document.querySelectorAll('#ocrLang option').length;
  clickSel('[data-pick="documents"]');
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    await wait(100);
    const meta = document.querySelector('#docList .doc-meta');
    if (meta) seen.add(meta.textContent);
    if (meta && !meta.classList.contains('reading')) break;
  }
  out.readingLabels = [...seen];
  out.scanSummary = (document.querySelector('#docList .doc-meta') || document.querySelector('#docList li') || {}).textContent;
  const view = document.querySelector('#docList .view');
  if (view) {
    view.click();
    await wait(300);
    out.viewText = document.getElementById('docTextBody').textContent.slice(0, 120);
    document.getElementById('closeDocText').click();
  } else {
    out.viewText = '(no View button)';
  }

  // Translate the scanned notice into Kannada with the stand-in AI.
  await window.api.providers.setBaseUrl('ollama', '__MOCK_AI__');
  await loadProviders();
  const prov = document.getElementById('provider');
  prov.value = 'ollama';
  prov.dispatchEvent(new Event('change'));
  const model = document.getElementById('model');
  model.value = 'mock-model';
  model.dispatchEvent(new Event('change'));
  await wait(300);
  clickSel('#docList .tr');
  await wait(300);
  document.getElementById('trTarget').value = 'kan';
  document.getElementById('trRun').click();
  for (let i = 0; i < 100 && document.getElementById('trRun').textContent.includes('Stop'); i++) await wait(100);
  await wait(200);
  out.translation = {
    text: document.getElementById('trText').value,
    status: document.getElementById('trStatus').textContent.slice(0, 60),
    info: document.getElementById('trInfo').textContent,
    exportEnabled: !document.getElementById('trExport').disabled,
  };
  document.getElementById('trClose').click();
  await wait(200);
  out.trButton = document.querySelector('#docList .tr').textContent;

  // Read with AI: accept the confirmation, wait for the transcription.
  let asked = '';
  window.confirm = (msg) => { asked = msg; return true; };
  out.aiButton = (document.querySelector('#docList .ai') || {}).textContent;
  clickSel('#docList .ai');
  for (let i = 0; i < 100; i++) {
    await wait(100);
    const meta = document.querySelector('#docList .doc-meta');
    if (meta && !meta.classList.contains('reading')) break;
  }
  out.aiRead = {
    asked: asked.includes('stay on this computer'),
    summary: document.querySelector('#docList .doc-meta').textContent,
    status: document.getElementById('status').textContent.slice(0, 50),
    trTitle: document.querySelector('#docList .tr').title,
  };

  // ⇄ Translate a document: upload → read → translation window opens itself.
  document.getElementById('translateDocBtn').click();
  for (let i = 0; i < 200 && !document.getElementById('translateDlg').open; i++) await wait(100);
  const uses = [...document.querySelectorAll('#docList .use')].map((b) => b.textContent);
  out.translateUpload = {
    dialogOpened: document.getElementById('translateDlg').open,
    original: document.getElementById('trOriginal').textContent.slice(0, 12),
    title: document.getElementById('trTitle').textContent,
    uses,
  };
  document.getElementById('trClose').click();
  // Toggle: the first document out of the draft and back in.
  clickSel('#docList .use');
  await wait(100);
  out.toggled = document.querySelector('#docList .use').textContent;
  clickSel('#docList .use');
  await wait(100);
  const pv = await window.api.prompts.preview(collectPayload());
  out.previewDocs = (pv.user.match(/SOURCE DOCUMENT D\\d+/g) || []).length;
  await wait(1500);
  return out;
})()`;

// After a reload (like restarting the app) the last matter should come back.
const AFTER_RELOAD = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 50 && !document.getElementById('facts').value; i++) await wait(100);
  await wait(300);
  return {
    facts: document.getElementById('facts').value,
    title: document.getElementById('matterTitle').value,
    refs: [...document.querySelectorAll('#refList .doc-name')].map((e) => e.textContent),
    checklistShown: !document.getElementById('formatChecklist').hidden,
    docs: [...document.querySelectorAll('#docList .doc-meta')].map((e) => e.textContent),
    trButton: (document.querySelector('#docList .tr') || {}).textContent,
    uses: [...document.querySelectorAll('#docList .use')].map((b) => b.textContent),
  };
})()`;

app.on('browser-window-created', (_e, win) => {
  win.webContents.on('console-message', (event) => {
    const level = event.level !== undefined ? event.level : event;
    if (level === 'error' || level === 3) problems.push(`console error: ${event.message}`);
  });
  win.webContents.on('render-process-gone', (_ev, details) => problems.push(`renderer gone: ${details.reason}`));
  win.webContents.on('preload-error', (_ev, p, err) => problems.push(`preload error: ${err.message}`));
  win.webContents.once('did-finish-load', async () => {
    try {
      await mockAiReady;
      const report = await win.webContents.executeJavaScript(PAGE_CHECKS.replace('__MOCK_AI__', process.env.SMOKE_MOCK_AI));
      const expect = (cond, msg) => cond || problems.push(msg);
      expect(report.isolated, 'renderer can reach Node');
      expect(report.providers.length === 5, 'expected 5 providers');
      expect(report.preview.hasNotesMarker && report.preview.endsWithTask, 'prompt preview incomplete');
      expect(report.providerCards === 5, 'provider cards missing');
      expect(report.promptEditorSections === report.promptSections, 'prompt editor sections missing');
      expect(/^Saved/.test(report.autosave), `not autosaved: ${report.autosave}`);
      expect(!report.afterNew.facts && !report.afterNew.title, 'New matter did not clear the fields');
      expect(report.listed.join() === 'Smoke v. Test', `matter list wrong: ${report.listed}`);
      expect(report.reopened.facts.startsWith('Smoke facts') && report.reopened.title === 'Smoke v. Test', 'reopen failed');
      expect(report.formatCount >= 35 && report.criminalCount === 8, `format picker counts: ${report.formatCount}/${report.criminalCount}`);
      expect(report.detailHasLaw, 'format detail missing law');
      const fu = report.formatUsed;
      expect(fu.refs[0] === 'Format: Regular bail application (Magistrate)', `format not added: ${fu.refs}`);
      expect(fu.factsPrefilled.startsWith('Accused / applicant'), `facts not prefilled: ${fu.factsPrefilled}`);
      expect(fu.instructions.startsWith('Indian criminal practice'), 'format notes not added to instructions');
      expect(fu.checklistShown && fu.checklistHasAnnexures, 'checklist not shown');
      expect(report.ocrLangOptions === 12, `expected 12 OCR language options, got ${report.ocrLangOptions}`);
      expect(report.readingLabels.some((l) => /Reading page \d of 2/.test(l)), `no reading progress shown: ${report.readingLabels}`);
      expect(/2 pages · scanned · OCR \d+%/.test(report.scanSummary), `scan summary: ${report.scanSummary}`);
      expect(/LEGAL NOTICE/.test(report.viewText), `View text: ${report.viewText}`);
      const tr = report.translation;
      expect(tr.text === 'ಕಾನೂನು ನೋಟಿಸ್', `translation text: ${tr.text}`);
      expect(/^— Kannada, by Ollama/.test(tr.info) && tr.exportEnabled, `translation info: ${tr.info}`);
      expect(report.trButton === 'Translation', `translate button after: ${report.trButton}`);
      expect(report.aiButton === 'Read with AI', `Read with AI button: ${report.aiButton}`);
      const ai = report.aiRead;
      expect(ai.asked, 'no confirmation naming where the images go');
      expect(/2 pages · all read by AI/.test(ai.summary), `AI read summary: ${ai.summary}`);
      expect(/read with AI \(2 pages\)/.test(ai.status), `AI read status: ${ai.status}`);
      const tu = report.translateUpload;
      expect(tu.dialogOpened && tu.original === 'LEGAL NOTICE', `translation window after upload: ${JSON.stringify(tu)}`);
      expect(tu.uses.join() === 'In draft,Not in draft', `In draft switches: ${tu.uses}`);
      expect(report.toggled === 'Not in draft', 'In draft switch did not toggle');
      expect(report.previewDocs === 1, `prompt should contain 1 document, has ${report.previewDocs}`);

      win.webContents.once('did-finish-load', async () => {
        report.afterRestart = await win.webContents.executeJavaScript(AFTER_RELOAD);
        const ar = report.afterRestart;
        expect(ar.title === 'Smoke bail matter', `last matter not reopened on start: ${ar.title}`);
        expect(ar.refs[0] === 'Format: Regular bail application (Magistrate)' && ar.checklistShown, 'format not restored with the matter');
        expect(ar.docs.length === 2 && /all read by AI/.test(ar.docs[0]), `documents not restored: ${ar.docs}`);
        expect(ar.uses.join() === 'In draft,Not in draft', `In draft switches not restored: ${ar.uses}`);
        expect(ar.trButton === 'Translation', 'translation not saved with the matter');
        finish({ versions: process.versions.electron, ...report });
      });
      win.webContents.reload();
    } catch (err) {
      problems.push(`page checks threw: ${err.message}`);
      finish({ ok: false });
    }
  });
});

require('../src/main.js');
