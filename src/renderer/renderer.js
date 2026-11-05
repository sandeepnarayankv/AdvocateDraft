'use strict';

const $ = (id) => document.getElementById(id);

// In-memory state for added source documents: { name, text, ok, error }
let documents = [];
// Format references: same shape plus role 'template' | 'precedent'.
let references = [];
// Line separating the draft from its source notes; set by the main process.
let notesMarker = '';

// ---------------------------------------------------------------------------
// AI providers
// ---------------------------------------------------------------------------
const settings = $('settings');
const P = window.api.providers;
let providerInfo = []; // from providers:status
const modelCache = {}; // provider id -> [{ id, label }]

const currentProvider = () => providerInfo.find((p) => p.id === $('provider').value) || providerInfo[0];

async function loadProviders() {
  const { providers, active, encryptionAvailable } = await P.status();
  providerInfo = providers;
  $('encHint').textContent = encryptionAvailable
    ? 'Stored encrypted with your OS keychain.'
    : '⚠ OS keychain unavailable — secrets are stored in plain text on this computer.';

  const sel = $('provider');
  const keep = sel.value || active.provider;
  sel.innerHTML = providers
    .map((p) => `<option value="${p.id}">${escapeHtml(p.label)}${p.configured ? '' : ' — not set up'}</option>`)
    .join('');
  sel.value = providers.some((p) => p.id === keep) ? keep : (providers.find((p) => p.configured) || providers[0]).id;
  if (!$('model').value || keep !== sel.value) {
    $('model').value = active.provider === sel.value && active.model ? active.model : currentProvider().model;
  }
  $('settingsBtn').textContent = providers.some((p) => p.configured && p.auth !== 'local') ? '⚙ AI providers' : '⚙ Set up AI';
  renderProviderCards();
  updateProviderHint();
  loadModels(sel.value);
}

// ---- Model dropdown ----------------------------------------------------------
// The list comes live from the provider. #model holds the chosen model id;
// it is shown as a text box only for "Other model id…".
const CUSTOM = '__custom__';
const modelErrors = {}; // provider id -> why the list could not be loaded
const modelLoading = new Set();

async function loadModels(id, { force = false } = {}) {
  const p = providerInfo.find((x) => x.id === id);
  if (!p) return;
  if (force) delete modelCache[id];
  if (!modelCache[id] && p.configured && !modelLoading.has(id)) {
    modelLoading.add(id);
    renderModelSelect();
    const res = await P.models(id);
    modelLoading.delete(id);
    if (res.ok) {
      modelCache[id] = res.models;
      delete modelErrors[id];
    } else {
      // Keep any fallback list, but say why the live list is missing.
      modelCache[id] = res.models || [];
      modelErrors[id] = res.error;
    }
  }
  if ($('provider').value !== id) return;
  const models = modelCache[id] || [];
  if (!$('model').value && models[0]) {
    $('model').value = models[0].id;
    P.setActive(id, models[0].id);
  }
  renderModelSelect();
}

function renderModelSelect() {
  const p = currentProvider();
  if (!p) return;
  const sel = $('modelSelect');
  const current = $('model').value.trim();
  const models = modelCache[p.id] || [];
  const opt = (value, text, extra = '') => `<option value="${escapeHtml(value)}"${extra}>${escapeHtml(text)}</option>`;
  const parts = [];
  if (!p.configured) parts.push(opt('', `Set up ${p.label} first (⚙ AI providers)`, ' disabled'));
  else if (modelLoading.has(p.id)) parts.push(opt('', 'Loading models…', ' disabled'));
  else if (modelErrors[p.id]) parts.push(opt('', `⚠ ${modelErrors[p.id]}`, ' disabled'));
  else if (!models.length) parts.push(opt('', 'No models found — press ↻ to reload', ' disabled'));
  if (current && !models.some((m) => m.id === current)) parts.push(opt(current, `${current} (current)`));
  for (const m of models) parts.push(opt(m.id, m.label && m.label !== m.id ? `${m.label} — ${m.id}` : m.id));
  parts.push(opt(CUSTOM, 'Other model id…'));
  sel.innerHTML = parts.join('');
  sel.value = current && [...sel.options].some((o) => o.value === current) ? current : '';
  if (!sel.value && sel.options.length) sel.selectedIndex = 0;
  sel.title = modelErrors[p.id] || 'Models offered by the selected provider';
}

$('modelSelect').addEventListener('change', () => {
  const v = $('modelSelect').value;
  if (v === CUSTOM) {
    $('model').hidden = false;
    $('model').value = '';
    $('model').focus();
    return;
  }
  $('model').hidden = true;
  $('model').value = v;
  P.setActive($('provider').value, v);
});

$('refreshModels').addEventListener('click', () => loadModels($('provider').value, { force: true }));

function updateProviderHint() {
  const p = currentProvider();
  const hint = $('providerHint');
  const parts = [p.privacy];
  if (p.id === 'ollama') {
    parts.push(
      'Local models have smaller context windows (the Small budget usually works best), are slower, and are more likely to add facts that are not in your material — check every paragraph.'
    );
  }
  hint.textContent = parts.filter(Boolean).join(' ');
  hint.hidden = !hint.textContent;
}

$('provider').addEventListener('change', () => {
  const p = currentProvider();
  $('model').value = p.model || '';
  $('model').hidden = true;
  renderModelSelect();
  P.setActive(p.id, $('model').value);
  updateProviderHint();
  renderProviderCards();
  loadModels(p.id);
});

// A typed model id ("Other model id…") is used as soon as it is entered.
$('model').addEventListener('change', () => {
  P.setActive($('provider').value, $('model').value.trim());
  renderModelSelect();
  if ($('modelSelect').value === $('model').value.trim()) $('model').hidden = true;
});

$('settingsBtn').addEventListener('click', () => {
  renderProviderCards();
  settings.showModal();
});
$('closeSettings').addEventListener('click', () => settings.close());

function providerState(card, text, cls) {
  const el = card.querySelector('.pstate');
  el.textContent = text;
  el.className = `pstate${cls ? ` ${cls}` : ''}`;
}

function renderProviderCards() {
  const wrap = $('providerCards');
  wrap.innerHTML = '';
  for (const p of providerInfo) {
    const card = document.createElement('div');
    card.className = `pcard${p.id === $('provider').value ? ' active' : ''}`;
    let body = '';
    let state = '';
    if (p.auth === 'key') {
      state = p.configured ? 'Key saved' : 'No key yet';
      body = `<div class="prow">
          <input type="password" class="key" autocomplete="off" spellcheck="false"
            placeholder="${p.configured ? '•••••••• saved — paste a new key to replace' : escapeHtml(p.keyPlaceholder)}" />
          <button class="ghost save">Save key</button>
          ${p.configured ? '<button class="ghost remove">Remove</button>' : ''}
          <button class="ghost test"${p.configured ? '' : ' disabled'}>Test</button>
        </div>
        <a href="${p.keyUrl}">Get a ${escapeHtml(p.label.replace(/ \(.*\)$/, ''))} API key ↗</a>`;
    } else if (p.auth === 'oauth') {
      state = p.signedIn
        ? `Signed in${p.email ? ` as ${p.email}` : ''}${p.planUsage ? '' : ' — plan usage not allowed'}`
        : 'Not signed in';
      body = p.signedIn
        ? `<div class="prow"><button class="ghost signout">Sign out</button><button class="ghost test">Test</button></div>`
        : `<div class="prow"><button class="primary signin">Sign in with ChatGPT</button></div>
           <p class="privacy">Opens your browser to sign in to ChatGPT and allow Advocate Draft to use your plan. This is an OpenAI preview feature.</p>`;
    } else {
      state = `Address: ${p.baseUrl}`;
      body = `<div class="prow">
          <input type="text" class="baseurl" spellcheck="false" value="${escapeHtml(p.baseUrl)}" />
          <button class="ghost saveurl">Save</button>
          <button class="ghost test">Test</button>
        </div>
        <a href="${p.keyUrl}">Install Ollama ↗</a>`;
    }
    card.innerHTML = `<div class="pcard-head"><span class="pcard-title">${escapeHtml(p.label)}</span>
        <span class="pstate${p.configured ? ' ok' : ''}">${escapeHtml(state)}</span></div>
      ${body}
      <p class="privacy">${escapeHtml(p.privacy)}</p>`;
    wireProviderCard(card, p);
    wrap.appendChild(card);
  }
}

function wireProviderCard(card, p) {
  const on = (sel, fn) => {
    const el = card.querySelector(sel);
    if (el) {
      el.addEventListener('click', async () => {
        el.disabled = true;
        try {
          await fn();
        } catch (err) {
          providerState(card, String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'err');
        } finally {
          el.disabled = false;
        }
      });
    }
  };
  const refresh = async (msg) => {
    delete modelCache[p.id];
    delete modelErrors[p.id];
    await loadProviders();
    if (msg) {
      const fresh = [...$('providerCards').children][providerInfo.findIndex((x) => x.id === p.id)];
      if (fresh) providerState(fresh, msg, 'ok');
    }
  };

  on('.save', async () => {
    const key = card.querySelector('.key').value.trim();
    if (!key) return providerState(card, 'Paste a key first.', 'err');
    await P.setKey(p.id, key);
    await refresh('Key saved. Press Test to check it.');
  });
  on('.remove', async () => {
    await P.setKey(p.id, '');
    await refresh('Key removed.');
  });
  on('.saveurl', async () => {
    await P.setBaseUrl(p.id, card.querySelector('.baseurl').value);
    await refresh('Address saved.');
  });
  on('.test', async () => {
    providerState(card, 'Testing…', '');
    const res = await P.models(p.id);
    if (!res.ok) {
      modelErrors[p.id] = res.error;
      if ($('provider').value === p.id) renderModelSelect();
      return providerState(card, res.error, 'err');
    }
    modelCache[p.id] = res.models;
    delete modelErrors[p.id];
    if ($('provider').value === p.id) loadModels(p.id);
    providerState(card, `Working · ${res.models.length} model${res.models.length === 1 ? '' : 's'} available`, 'ok');
  });
  on('.signin', async () => {
    providerState(card, 'Waiting for you to finish signing in in your browser…', '');
    const res = await P.chatgptSignIn();
    if (!res.ok) return providerState(card, res.error, 'err');
    await refresh(res.planUsage ? 'Signed in. Press Test to load your models.' : 'Signed in, but plan usage was not allowed.');
  });
  on('.signout', async () => {
    const res = await P.chatgptSignOut();
    await refresh(res.revoked ? 'Signed out.' : 'Signed out on this computer. To fully disconnect, remove the app in ChatGPT → Settings.');
  });
}

// ---------------------------------------------------------------------------
// File pickers
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-pick]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const kind = btn.getAttribute('data-pick');
    const results = await window.api.pickFiles(kind);
    if (!results || !results.length) return;

    if (kind === 'template' || kind === 'precedent') {
      for (const r of results) references.push({ ...r, role: kind });
      renderRefs();
    } else {
      for (const r of results) documents.push(r);
      renderDocs();
    }
  });
});

const DOCS_EMPTY = 'No documents added. PDF (including scans), DOCX, TXT and photos of documents supported.';
const renderDocs = () => {
  renderFileList($('docList'), documents, DOCS_EMPTY, renderDocs);
  scheduleSave();
};

// ---- Reading progress and OCR ----------------------------------------------
const LOW_OCR_CONFIDENCE = 75;
const lowOcr = (d) => d.ocrPages > 0 && d.confidence !== null && d.confidence < LOW_OCR_CONFIDENCE;

function readingLabel(d) {
  if (!d.progress) return 'Reading…';
  const { page, total } = d.progress;
  return `Reading page ${page} of ${total}${d.scanned ? ' (scanned — OCR)' : ''}…`;
}

function docSummary(d) {
  const parts = [];
  if (d.pages) parts.push(`${d.pages} page${d.pages === 1 ? '' : 's'}`);
  if (d.aiPages) parts.push(`${d.aiPages === d.pages ? 'all' : d.aiPages} read by AI`);
  if (d.ocrPages) parts.push(`${d.ocrPages === d.pages ? 'scanned' : `${d.ocrPages} scanned`} · OCR ${d.confidence}%`);
  if (lowOcr(d)) parts.push('⚠ check text');
  parts.push(`${d.text.length.toLocaleString()} chars`);
  return parts.join(' · ');
}

function ocrTitle(d) {
  if (!d.ocrPages) return '';
  return lowOcr(d)
    ? 'The scan was hard to read. Use View to check names, dates and amounts before relying on it.'
    : 'Text on scanned pages was read by OCR. Check names, dates and amounts in the draft against the original.';
}

// ---- Read with AI (handwriting / poor scans) -------------------------------
function aiReadingLabel(d) {
  const r = d.aiReading;
  if (!r || r.stage === 'preparing') return 'Preparing pages for AI…';
  return `AI reading page ${r.page} of ${r.total}…`;
}

let aiReadTarget = null; // { doc, rerender }

window.api.aiRead.onProgress((p) => {
  if (!aiReadTarget || aiReadTarget.doc.sourceId !== p.sourceId) return;
  aiReadTarget.doc.aiReading = p;
  // Redraw without saving: progress is not an edit.
  const isDoc = documents.includes(aiReadTarget.doc);
  renderFileList(isDoc ? $('docList') : $('refList'), isDoc ? documents : references, isDoc ? DOCS_EMPTY : '', aiReadTarget.rerender, !isDoc);
});

async function readDocWithAi(doc, rerender) {
  const p = currentProvider();
  if (!p || !p.configured) return setStatus(`Set up ${p ? p.label : 'an AI provider'} first (⚙ AI providers).`, 'err');
  const model = $('model').value.trim();
  if (!model) return setStatus('Choose a model first.', 'err');
  if (aiReadTarget) return setStatus('Another document is being read with AI. Wait for it to finish.', 'err');

  const where =
    p.auth === 'local'
      ? `${p.label} — the images stay on this computer`
      : `${p.label} (${model}) — the images of the scanned pages leave this computer. ${p.privacy}`;
  const ok = confirm(
    `Read “${doc.name}” with AI?\n\n` +
      `The scanned page images will be sent to:\n${where}\n\n` +
      'The model must be able to read images. The text read now will replace the current text of this document; ' +
      'check names, dates and amounts against the original afterwards.'
  );
  if (!ok) return;

  aiReadTarget = { doc, rerender };
  doc.aiReading = { stage: 'preparing' };
  rerender();
  setStatus(`Reading “${doc.name}” with ${p.label}…`, 'busy');
  // The OCR text so far, for cross-checking Indian-script lines.
  const previousText = doc.ocrPages > 0 ? doc.text : '';
  const res = await window.api.aiRead.run({ sourceId: doc.sourceId, provider: p.id, model, previousText });
  delete doc.aiReading;
  aiReadTarget = null;
  if (!documents.includes(doc) && !references.includes(doc)) return; // removed meanwhile

  if (res.ok) {
    Object.assign(doc, {
      text: res.text,
      aiPages: res.aiPages,
      aiReadBy: `${res.provider} · ${res.model}`,
      ocrPages: 0,
      confidence: null,
    });
    if (doc.translation) doc.translation.stale = true;
    doc.strayScripts = res.strayScripts || [];
    doc.ocrMismatch = res.ocrMismatch || [];
    if (doc.ocrMismatch.length) {
      // The AI and the earlier OCR read Indian-script text differently.
      const m = doc.ocrMismatch[0];
      setStatus(
        `Check “${doc.name}”: the AI and the OCR read the ${m.script} text differently (${m.agreement}% of words agree). ` +
          `OCR: “${m.ocr}” — AI: “${m.ai}”. Printed ${m.script} is often read better by OCR; compare with the original (View).`,
        'warn'
      );
    } else if (doc.strayScripts.length) {
      // e.g. Malayalam when reading English + Kannada: the model likely
      // substituted text for a line it could not read.
      setStatus(
        `Check “${doc.name}”: the AI wrote some text in ${doc.strayScripts.join(' and ')} script, which you did not select for scans. ` +
          'It may have replaced a line it could not read with other text — compare with the original (View).',
        'warn'
      );
    } else {
      setStatus(
        res.truncated
          ? `Read with AI, but ${res.truncated} page(s) were cut short — use View and compare with the original.`
          : `“${doc.name}” read with AI (${res.aiPages} page${res.aiPages === 1 ? '' : 's'}). Use View to check it against the original.`,
        res.truncated ? 'warn' : ''
      );
    }
  } else {
    setStatus(res.cancelled ? 'AI reading stopped; the earlier text is kept.' : `AI reading failed: ${res.error}`, res.cancelled ? '' : 'err');
  }
  rerender();
}

// Find the entry for a background reading job in either list.
function findJob(jobId) {
  const inDocs = documents.find((d) => d.jobId === jobId);
  if (inDocs) return { item: inDocs, list: documents, render: renderDocs };
  const inRefs = references.find((r) => r.jobId === jobId);
  if (inRefs) return { item: inRefs, list: references, render: renderRefs };
  return null;
}

window.api.onReadProgress(({ jobId, page, total, ocr }) => {
  const found = findJob(jobId);
  if (!found) return;
  found.item.progress = { page, total };
  if (ocr) found.item.scanned = true;
  // Redraw only; progress is not a change worth saving.
  const isDoc = found.list === documents;
  renderFileList(isDoc ? $('docList') : $('refList'), found.list, isDoc ? DOCS_EMPTY : '', found.render, !isDoc);
});

window.api.onReadDone(({ jobId, result, cancelled }) => {
  const found = findJob(jobId);
  if (!found) return;
  if (cancelled) {
    found.list.splice(found.list.indexOf(found.item), 1);
  } else {
    delete found.item.pending;
    delete found.item.jobId;
    delete found.item.progress;
    delete found.item.scanned;
    Object.assign(found.item, result);
    if (lowOcr(found.item)) {
      setStatus(`“${found.item.name}” was hard to read (OCR ${found.item.confidence}%). Use View to check its text.`, 'warn');
    }
  }
  found.render();
  // A file uploaded with ⇄ Translate a document: open it now it is read.
  if (openWhenRead === found.item) {
    openWhenRead = null;
    if (found.item.ok) {
      if (!lowOcr(found.item)) setStatus('', '');
      openTranslation(found.item, renderDocs);
    } else if (!cancelled) {
      setStatus(`Could not read “${found.item.name}”: ${found.item.error}`, 'err');
    }
  }
});

// The text read from a file, so OCR results can be checked.
const docTextDlg = $('docTextDlg');
function showDocText(d) {
  $('docTextTitle').textContent = d.name;
  $('docTextInfo').textContent = d.ocrPages
    ? `${docSummary(d)}. Scanned pages were read by OCR — compare names, dates and amounts with the original.`
    : docSummary(d);
  $('docTextBody').textContent = d.text;
  docTextDlg.showModal();
}
$('closeDocText').addEventListener('click', () => docTextDlg.close());

// ---- Translation -----------------------------------------------------------
const translateDlg = $('translateDlg');
const T = window.api.translate;
let languageNames = { eng: 'English' };
const langName = (code) => (code === 'auto' ? 'the original language' : languageNames[code] || code);
let trDoc = null; // the document being translated
let trRerender = null; // redraws the list it belongs to
let translating = false;

function setTrStatus(msg, cls) {
  $('trStatus').textContent = msg;
  $('trStatus').className = `hint${cls ? ` ${cls}` : ''}`;
}

function setTranslating(on) {
  translating = on;
  $('trRun').textContent = on ? '■ Stop' : trDoc && trDoc.translation ? 'Translate again' : 'Translate';
  $('trRun').classList.toggle('stop', on);
  $('trText').readOnly = on;
  $('trSource').disabled = on;
  $('trTarget').disabled = on;
  const has = Boolean($('trText').value.trim());
  $('trCopy').disabled = on || !has;
  $('trExport').disabled = on || !has;
}

function describeTranslation(t) {
  if (!t) return '';
  const when = new Date(t.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return `— ${langName(t.target)}, by ${t.provider} · ${t.model}, ${when}${t.edited ? ' · edited' : ''}${t.partial ? ' · incomplete' : ''}${t.stale ? ' · the original was re-read since — translate again' : ''}`;
}

function openTranslation(doc, rerender) {
  trDoc = doc;
  trRerender = rerender;
  $('trTitle').textContent = `Translate — ${doc.name}`;
  $('trOriginal').textContent = doc.text;
  const t = doc.translation;
  $('trSource').value = t ? t.source : 'auto';
  $('trTarget').value = t ? t.target : 'eng';
  $('trText').value = t ? t.text : '';
  $('trInfo').textContent = describeTranslation(t);
  const p = currentProvider();
  setTrStatus(
    p && p.configured
      ? `Translation uses ${p.label} · ${$('model').value || 'no model chosen'}.${doc.ocrPages ? ' This document was read by OCR: check names and figures against the original.' : ''}`
      : `Set up ${p ? p.label : 'an AI provider'} first (⚙ AI providers).`,
    p && p.configured ? '' : 'err'
  );
  setTranslating(false);
  translateDlg.showModal();
}

T.onProgress(({ part, total }) => {
  if (translating) setTrStatus(total > 1 ? `Translating part ${part} of ${total}…` : 'Translating…', 'busy');
});
T.onDelta((text) => {
  if (!translating) return;
  const el = $('trText');
  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  el.value += text;
  if (atEnd) el.scrollTop = el.scrollHeight;
});

function saveTranslation(fields) {
  trDoc.translation = { ...(trDoc.translation || {}), ...fields };
  $('trInfo').textContent = describeTranslation(trDoc.translation);
  if (trRerender) trRerender();
}

$('trRun').addEventListener('click', async () => {
  if (translating) {
    setTrStatus('Stopping…', 'busy');
    await T.cancel();
    return;
  }
  const p = currentProvider();
  if (!p || !p.configured) return setTrStatus(`Set up ${p ? p.label : 'an AI provider'} first (⚙ AI providers).`, 'err');
  if (!$('model').value.trim()) return setTrStatus('Choose a model first.', 'err');
  const source = $('trSource').value;
  const target = $('trTarget').value;
  if (source === target) return setTrStatus('Choose a different language to translate into.', 'err');

  $('trText').value = '';
  $('trInfo').textContent = '';
  setTranslating(true);
  setTrStatus(`Contacting ${p.label}…`, 'busy');
  const res = await T.run({ name: trDoc.name, text: trDoc.text, source, target, provider: p.id, model: $('model').value.trim() });
  setTranslating(false);
  const base = { source, target, at: new Date().toISOString(), provider: p.label, model: $('model').value.trim(), edited: false };
  if (res.ok) {
    $('trText').value = res.text;
    saveTranslation({ ...base, text: res.text, partial: res.truncatedParts > 0, provider: res.provider, model: res.model });
    setTrStatus(
      res.truncatedParts
        ? `Done, but ${res.truncatedParts} part(s) hit the length limit and may be cut short — compare with the original.`
        : 'Translated. Review it against the original; correct anything here. A translation for filing must be certified by a translator.',
      res.truncatedParts ? 'warn' : ''
    );
  } else {
    const partial = $('trText').value.trim();
    if (partial) saveTranslation({ ...base, text: partial, partial: true });
    setTrStatus(res.cancelled ? 'Stopped. The part translated so far is kept.' : `Error: ${res.error}`, res.cancelled ? '' : 'err');
  }
  setTranslating(false);
});

$('trText').addEventListener('input', () => {
  if (!trDoc || translating) return;
  saveTranslation({ text: $('trText').value, edited: true });
  setTranslating(false);
});
$('trCopy').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('trText').value);
  setTrStatus('Translation copied.', '');
});
$('trExport').addEventListener('click', async () => {
  const res = await T.exportDocx({ name: trDoc.name, source: $('trSource').value, target: $('trTarget').value, text: $('trText').value });
  if (!res.ok) setTrStatus(`Export failed: ${res.error}`, 'err');
  else if (res.saved) setTrStatus(`Saved: ${res.filePath}. Complete the translator's certificate before filing.`, '');
});
$('trClose').addEventListener('click', async () => {
  if (translating) await T.cancel();
  translateDlg.close();
});
translateDlg.addEventListener('cancel', () => translating && T.cancel());

// ⇄ Translate a document: upload a file just to translate it. It joins the
// matter's documents (so it is saved, and can be read with AI if handwritten)
// but is kept out of the draft. The translation window opens once it is read.
let openWhenRead = null;

$('translateDocBtn').addEventListener('click', async () => {
  const results = await window.api.pickFiles('documents');
  if (!results || !results.length) return;
  const added = results.map((r) => ({ ...r, useInDraft: false }));
  documents.push(...added);
  renderDocs();
  const first = added[0];
  if (added.length > 1) {
    setStatus(`${added.length} documents added for translation (not used in the draft). Use Translate on each one.`, '');
  }
  if (first.pending) {
    openWhenRead = first;
    setStatus(`Reading “${first.name}”… the translation window opens when it is ready.`, 'busy');
  } else if (first.ok) {
    openTranslation(first, renderDocs);
  } else {
    setStatus(`Could not read “${first.name}”: ${first.error}`, 'err');
  }
});

// ---- Meaning-based search ---------------------------------------------------
const SEM = window.api.semantic;
function showSemantic(s) {
  $('semanticSearch').checked = s.enabled && s.ready;
  $('semanticSearch').disabled = Boolean(s.downloading);
  $('semanticState').textContent = s.downloading ? '(downloading…)' : s.enabled && s.ready ? '(on this computer)' : s.ready ? '' : '(one-time 130 MB download)';
}
SEM.status().then(showSemantic);
SEM.onProgress(({ loaded, total, file }) => {
  if (!total || !/\.onnx$/.test(file || '')) return;
  const pct = Math.round((loaded / total) * 100);
  $('semanticState').textContent = `(downloading ${pct}%)`;
  setStatus(`Downloading the meaning-based search model… ${pct}% (${Math.round(loaded / 1048576)} of ${Math.round(total / 1048576)} MB)`, 'busy');
});
$('semanticSearch').addEventListener('change', async (e) => {
  if (!e.target.checked) {
    showSemantic(await SEM.disable());
    setStatus('Meaning-based search is off. Long documents are searched by keyword only.', '');
    return;
  }
  const s = await SEM.status();
  if (!s.ready) {
    const ok = confirm(
      'Turn on meaning-based search?\n\n' +
        'This downloads a language model (about 130 MB) from Hugging Face, once. After that it runs entirely on this ' +
        'computer — your documents are never uploaded for it.\n\n' +
        'It helps when documents are too long to send whole: passages are then picked by meaning as well as by ' +
        'keyword (for example "advance" when the facts say "deposit", or a passage in an Indian language).'
    );
    if (!ok) {
      e.target.checked = false;
      return;
    }
  }
  showSemantic({ ...s, downloading: !s.ready });
  const res = await SEM.enable();
  showSemantic(res);
  if (res.ok) setStatus('Meaning-based search is on. It is used when documents are too long to send whole.', '');
  else {
    $('semanticSearch').checked = false;
    setStatus(res.error, 'err');
  }
});

// Language(s) for reading scans.
(async () => {
  const { langs, languages } = await window.api.ocr.settings();
  languageNames = languages;
  const trOptions = Object.entries(languages).map(([code, n]) => `<option value="${code}">${escapeHtml(n)}</option>`).join('');
  $('trSource').innerHTML = `<option value="auto">Detect automatically</option>${trOptions}`;
  $('trTarget').innerHTML = trOptions;
  const sel = $('ocrLang');
  const others = Object.keys(languages).filter((l) => l !== 'eng');
  sel.innerHTML =
    '<option value="eng">Scans in: English</option>' +
    others.map((l) => `<option value="eng+${l}">Scans in: English + ${escapeHtml(languages[l])}</option>`).join('');
  sel.value = langs.join('+');
  if (!sel.value) sel.value = 'eng';
  sel.addEventListener('change', async () => {
    await window.api.ocr.setLangs(sel.value.split('+'));
    setStatus(`New scans will be read as ${sel.options[sel.selectedIndex].text.replace('Scans in: ', '')}. Files already added are not re-read.`, '');
  });
})();

const renderRefs = () => {
  renderFileList(
    $('refList'),
    references,
    'Optional: a blank template to fill, or a previous document to model this one on.',
    renderRefs,
    true
  );
  updateWordFormats();
  renderChecklist();
  scheduleSave();
};

// Word export formatting: the standard format, or any .docx template /
// previous document. Defaults to a template, then a previous document, until
// the advocate picks one.
let wordFormatChosen = false;
$('wordFormat').addEventListener('change', () => (wordFormatChosen = true));

function updateWordFormats() {
  const sel = $('wordFormat');
  const current = sel.value;
  const docx = references.filter((r) => r.formatId);
  const ordered = [...docx.filter((r) => r.role === 'template'), ...docx.filter((r) => r.role === 'precedent')];
  sel.innerHTML =
    '<option value="">Word format: standard court format</option>' +
    ordered
      .map((r) => `<option value="${r.formatId}">Word format: as ${escapeHtml(r.name)}</option>`)
      .join('');
  const stillThere = [...sel.options].some((o) => o.value === current);
  sel.value = wordFormatChosen && stillThere ? current : ordered[0] ? ordered[0].formatId : '';
}

function renderFileList(list, items, emptyText, rerender, withRole = false) {
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = `<li class="empty">${emptyText}</li>`;
    return;
  }
  items.forEach((d, i) => {
    const li = document.createElement('li');
    const canAiRead = d.ok && d.sourceId && (d.ocrPages > 0 || d.aiPages > 0) && !d.aiReading;
    const aiBtn = canAiRead
      ? `<button class="ai${lowOcr(d) ? ' suggest' : ''}" data-i="${i}" title="Send the scanned page images to the selected AI model to read handwriting or a poor scan">${d.aiPages ? 'Re-read with AI' : 'Read with AI'}</button>`
      : '';
    const meta = d.pending || d.aiReading
      ? `<span class="doc-meta reading">${escapeHtml(d.aiReading ? aiReadingLabel(d) : readingLabel(d))}</span>`
      : d.ok
        ? `<span class="doc-meta${lowOcr(d) ? ' doc-warn' : ''}" title="${escapeHtml(ocrTitle(d))}">${escapeHtml(docSummary(d))}</span>
           <button class="view" data-i="${i}" title="See the text that was read from this file">View</button>
           ${aiBtn}
           <button class="tr${d.translation ? ' done' : ''}" data-i="${i}" title="${d.translation ? `Translated into ${escapeHtml(langName(d.translation.target))} — open to review or export` : 'Translate this document'}">${d.translation ? 'Translation' : 'Translate'}</button>`
        : `<span class="doc-meta doc-err">${escapeHtml(d.error || 'unreadable')}</span>`;
    const role = withRole
      ? `<select class="role" data-i="${i}" title="Template: followed exactly. Previous document: structure and language reused, facts ignored.">
          <option value="template"${d.role === 'template' ? ' selected' : ''}>Template</option>
          <option value="precedent"${d.role === 'precedent' ? ' selected' : ''}>Previous document</option>
        </select>`
      : '';
    // Source documents can be kept in the matter without going into the draft
    // (e.g. a document uploaded only to be translated).
    const inDraft = d.useInDraft !== false;
    const use = withRole
      ? ''
      : `<button class="use${inDraft ? '' : ' off'}" data-i="${i}" title="${inDraft ? 'Sent to the AI when drafting. Click to keep it out of the draft.' : 'Kept in the matter but not sent when drafting. Click to use it in the draft.'}">${inDraft ? 'In draft' : 'Not in draft'}</button>`;
    li.innerHTML = `<span class="doc-name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</span>
      <span class="doc-right">${meta}${use}${role}<button class="rm" title="Remove" data-i="${i}">×</button></span>`;
    list.appendChild(li);
  });
  list.querySelectorAll('.rm').forEach((b) =>
    b.addEventListener('click', () => {
      const [removed] = items.splice(Number(b.getAttribute('data-i')), 1);
      // Removing a file that is still being read stops the reading.
      if (removed && removed.pending) window.api.cancelRead(removed.jobId);
      if (removed && removed.aiReading) window.api.aiRead.cancel();
      rerender();
    })
  );
  list.querySelectorAll('.view').forEach((b) =>
    b.addEventListener('click', () => showDocText(items[Number(b.getAttribute('data-i'))]))
  );
  list.querySelectorAll('.tr').forEach((b) =>
    b.addEventListener('click', () => openTranslation(items[Number(b.getAttribute('data-i'))], rerender))
  );
  list.querySelectorAll('.ai').forEach((b) =>
    b.addEventListener('click', () => readDocWithAi(items[Number(b.getAttribute('data-i'))], rerender))
  );
  list.querySelectorAll('.use').forEach((b) =>
    b.addEventListener('click', () => {
      const d = items[Number(b.getAttribute('data-i'))];
      d.useInDraft = d.useInDraft === false;
      rerender();
    })
  );
  list.querySelectorAll('.role').forEach((s) =>
    s.addEventListener('change', () => {
      items[Number(s.getAttribute('data-i'))].role = s.value;
      rerender();
    })
  );
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
// Streamed text is buffered and written once per frame.
let generating = false;
let pendingText = '';
let flushQueued = false;

function flushDraft() {
  flushQueued = false;
  if (!pendingText) return;
  const el = $('draft');
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  el.value += pendingText;
  pendingText = '';
  // Follow the text only if the user hasn't scrolled up to read.
  if (nearBottom) el.scrollTop = el.scrollHeight;
}

// While a reasoning model thinks, no text arrives for a while (minutes on a
// local model). Show that it is working, with elapsed time.
let thinkingTimer = null;
let generationStarted = 0;
function stopThinkingTimer() {
  clearInterval(thinkingTimer);
  thinkingTimer = null;
}
window.api.onThinking(() => {
  if (!generating || thinkingTimer || $('draft').value || pendingText) return;
  const tick = () =>
    setStatus(`The model is reasoning before it writes… ${Math.round((Date.now() - generationStarted) / 1000)}s`, 'busy');
  tick();
  thinkingTimer = setInterval(tick, 1000);
});

window.api.onDelta((text) => {
  if (!generating) return;
  stopThinkingTimer();
  if (!$('draft').value && !pendingText) setStatus('Writing draft…', 'busy');
  pendingText += text;
  if (!flushQueued) {
    flushQueued = true;
    requestAnimationFrame(flushDraft);
  }
});

$('generateBtn').addEventListener('click', async () => {
  if (generating) {
    setStatus('Stopping…', 'busy');
    await window.api.cancel();
    return;
  }

  const provider = currentProvider();
  if (!provider || !provider.configured) {
    setStatus(`Set up ${provider ? provider.label : 'an AI provider'} first.`, 'err');
    renderProviderCards();
    settings.showModal();
    return;
  }
  if (!$('model').value.trim()) {
    setStatus('Choose a model first (press Test under ⚙ AI providers to load the list).', 'err');
    return;
  }
  const reading = [...documents, ...references].filter((d) => (d.pending || d.aiReading) && d.useInDraft !== false).length;
  if (reading) {
    setStatus(`Wait — ${reading} file${reading > 1 ? 's are' : ' is'} still being read.`, 'err');
    return;
  }

  const facts = $('facts').value.trim();
  if (!facts && !documents.some((d) => d.text && d.useInDraft !== false)) {
    setStatus('Add some case facts or at least one readable document.', 'err');
    return;
  }

  $('draft').value = '';
  $('usage').textContent = '';
  renderCarryOver([]);
  pendingText = '';
  setBusy(true);
  setStatus(`Preparing context and contacting ${provider.label}…`, 'busy');

  const res = await window.api.generate(collectPayload());

  flushDraft();
  setBusy(false);
  // Saves the finished (or partial) draft once the fields below are updated.
  scheduleSave();
  const hasPartial = Boolean($('draft').value.trim());

  if (!res.ok) {
    $('copyBtn').disabled = !hasPartial;
    $('exportBtn').disabled = !hasPartial;
    if (res.cancelled) {
      setStatus(hasPartial ? 'Stopped. The partial draft is kept — review it or generate again.' : 'Stopped.', '');
    } else {
      setStatus(`Error: ${res.error}${hasPartial ? ' (partial draft kept)' : ''}`, 'err');
    }
    return;
  }

  notesMarker = res.notesMarker;
  // The final message is authoritative; replace the streamed copy with it.
  $('draft').value = res.text;
  $('copyBtn').disabled = false;
  $('exportBtn').disabled = false;
  const u = res.usage;
  const tokens = u
    ? `${u.input_tokens?.toLocaleString() || '?'} in / ${u.output_tokens?.toLocaleString() || '?'} out tokens`
    : '';
  $('usage').textContent = [res.providerLabel, res.model, tokens, describeContext(res.context)].filter(Boolean).join(' · ');

  renderCarryOver(res.carryOver || []);

  if (res.stopReason === 'max_tokens' && !res.text.trim()) {
    // Reasoning models can spend the whole output allowance thinking.
    setStatus(
      'The model used its whole output allowance on reasoning and wrote no draft. Generate again, or choose a model that reasons less.',
      'err'
    );
  } else if (res.stopReason === 'max_tokens') {
    setStatus('Draft was cut off at the length limit. Review the ending, or shorten the format.', 'err');
  } else if (!res.text.trim()) {
    setStatus('The model returned an empty draft. Generate again, or choose another model.', 'err');
  } else if (res.carryOver?.length) {
    const n = res.carryOver.length;
    setStatus(`Draft ready. ${n} possible detail${n > 1 ? 's' : ''} from the previous document to check (below the draft).`, 'err');
  } else if (res.context?.mode === 'retrieved') {
    setStatus('Draft ready. Documents were too long to send whole, so only the most relevant passages were used. Check the source notes.', '');
  } else {
    setStatus('Draft ready. Review carefully before use.', '');
  }
});

function describeContext(c) {
  if (!c || !c.documents) return 'no source documents';
  const k = (n) => `${Math.round(n / 1000)}k`;
  return c.mode === 'full'
    ? `full text of ${c.documents} doc${c.documents > 1 ? 's' : ''} (${k(c.usedChars)} chars)`
    : `${c.passagesUsed} of ${c.passagesTotal} passages picked by ${c.method || 'keyword'} (${k(c.totalChars)} → ${k(c.usedChars)} chars)`;
}

// Current inputs, as sent for generation and for the prompt preview.
function collectPayload() {
  return {
    template: $('template').value.trim(),
    references: references.filter((r) => r.ok).map(({ name, text, role }) => ({ name, text, role })),
    facts: $('facts').value.trim(),
    documents: documents.filter((d) => d.ok && d.useInDraft !== false),
    provider: $('provider').value,
    model: $('model').value.trim(),
    maxTokens: 16000,
    budgetChars: Number($('budget').value),
    includeNotes: $('includeNotes').checked,
  };
}

// ---------------------------------------------------------------------------
// Prompt editor
// ---------------------------------------------------------------------------
const promptsDlg = $('promptsDlg');
let promptSections = []; // { key, label, when, default, value, custom, el }
let promptsDirty = false;

function setPromptsDirty(dirty, note) {
  promptsDirty = dirty;
  $('promptsDirty').textContent = note || (dirty ? 'Unsaved changes' : '');
}

function renderPromptSections() {
  const wrap = $('promptSections');
  wrap.innerHTML = '';
  for (const s of promptSections) {
    const div = document.createElement('div');
    div.className = 'psec';
    div.innerHTML = `<div class="psec-head">
        <div><span class="psec-title">${escapeHtml(s.label)}</span><span class="badge" hidden>Customised</span></div>
        <button class="link reset">Reset to default</button>
      </div>
      <div class="psec-when">Used: ${escapeHtml(s.when)}</div>
      <textarea spellcheck="false"></textarea>`;
    const ta = div.querySelector('textarea');
    const badge = div.querySelector('.badge');
    const reset = div.querySelector('.reset');
    ta.value = s.value;
    ta.rows = Math.min(14, Math.max(3, Math.ceil(s.value.length / 110) + s.value.split('\n').length));
    const sync = () => {
      const t = ta.value.trim();
      const custom = Boolean(t) && t !== s.default;
      div.classList.toggle('custom', custom);
      badge.hidden = !custom;
      reset.hidden = !custom;
    };
    ta.addEventListener('input', () => {
      sync();
      setPromptsDirty(true);
    });
    reset.addEventListener('click', () => {
      ta.value = s.default;
      sync();
      setPromptsDirty(true);
    });
    s.el = ta;
    sync();
    wrap.appendChild(div);
  }
}

const currentPromptValues = () => Object.fromEntries(promptSections.map((s) => [s.key, s.el.value]));

function showPromptTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $('tab-edit').hidden = name !== 'edit';
  $('tab-preview').hidden = name !== 'preview';
  if (name === 'preview') refreshPreview();
}

async function refreshPreview() {
  const PREVIEW_LIMIT = 200000;
  const p = await window.api.prompts.preview({ ...collectPayload(), promptOverrides: currentPromptValues() });
  const clip = (s) => (s.length > PREVIEW_LIMIT ? `${s.slice(0, PREVIEW_LIMIT)}\n\n[… ${(s.length - PREVIEW_LIMIT).toLocaleString()} more characters not shown …]` : s);
  $('previewSystem').textContent = p.system;
  $('previewUser').textContent = clip(p.user);
  $('previewInfo').textContent = [
    `About ${Math.round(p.chars / 4).toLocaleString()} input tokens`,
    p.mode === 'retrieved' ? 'documents are too long, so only the most relevant passages are included' : 'full document text included',
    promptsDirty ? 'includes your unsaved changes' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

$('promptsBtn').addEventListener('click', async () => {
  promptSections = await window.api.prompts.get();
  renderPromptSections();
  setPromptsDirty(false);
  showPromptTab('edit');
  promptsDlg.showModal();
});

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showPromptTab(t.dataset.tab)));

$('savePrompts').addEventListener('click', async () => {
  promptSections = await window.api.prompts.save(currentPromptValues());
  renderPromptSections();
  const n = promptSections.filter((s) => s.custom).length;
  setPromptsDirty(false, n ? `Saved · ${n} customised section${n > 1 ? 's' : ''}` : 'Saved · all defaults');
  if (!$('tab-preview').hidden) refreshPreview();
});

$('resetAllPrompts').addEventListener('click', () => {
  for (const s of promptSections) s.value = s.default;
  renderPromptSections();
  setPromptsDirty(true, 'All sections reset to default. Press Save to keep this.');
});

$('importPrompts').addEventListener('click', async () => {
  const res = await window.api.prompts.importFile();
  if (res.cancelled) return;
  if (!res.ok) {
    setPromptsDirty(promptsDirty, `Import failed: ${res.error}`);
    return;
  }
  promptSections = res.sections;
  renderPromptSections();
  showPromptTab('edit');
  const n = res.sections.filter((s) => s.custom).length;
  const skipped = res.unknown.length ? ` ${res.unknown.length} unrecognised section(s) ignored.` : '';
  setPromptsDirty(true, `Imported ${n} customised section${n === 1 ? '' : 's'}. Review, then Save.${skipped}`);
});

$('exportPrompts').addEventListener('click', async () => {
  const res = await window.api.prompts.exportFile();
  if (res.saved) {
    setPromptsDirty(promptsDirty, `Exported saved prompts${promptsDirty ? ' (unsaved changes not included)' : ''}`);
  }
});

const confirmDiscard = () => !promptsDirty || confirm('Discard unsaved prompt changes?');
$('closePrompts').addEventListener('click', () => {
  if (confirmDiscard()) promptsDlg.close();
});
promptsDlg.addEventListener('cancel', (e) => {
  if (!confirmDiscard()) e.preventDefault();
});

// ---------------------------------------------------------------------------
// Built-in Indian formats
// ---------------------------------------------------------------------------
const formatsDlg = $('formatsDlg');
let formatCatalog = { categories: [], formats: [] };
let formatCategory = 'All';
let selectedFormatId = null;
const catalogReady = window.api.formats.list().then((c) => (formatCatalog = c));

function renderFormatPicker() {
  const q = $('formatSearch').value.trim().toLowerCase();
  $('formatCats').innerHTML = ['All', ...formatCatalog.categories]
    .map((c) => `<button data-cat="${escapeHtml(c)}" class="${c === formatCategory ? 'active' : ''}">${escapeHtml(c)}</button>`)
    .join('');
  $('formatCats').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      formatCategory = b.dataset.cat;
      renderFormatPicker();
    })
  );
  const shown = formatCatalog.formats.filter(
    (f) =>
      (formatCategory === 'All' || f.category === formatCategory) &&
      (!q || `${f.title} ${f.law} ${f.use}`.toLowerCase().includes(q))
  );
  $('formatList').innerHTML = shown.length
    ? shown
        .map(
          (f) => `<li data-id="${f.id}" class="${f.id === selectedFormatId ? 'sel' : ''}">
            <div class="ft">${escapeHtml(f.title)}</div><div class="fc">${escapeHtml(f.law)}</div></li>`
        )
        .join('')
    : '<li class="fc">No formats match.</li>';
  $('formatList').querySelectorAll('li[data-id]').forEach((li) =>
    li.addEventListener('click', () => showFormat(li.dataset.id))
  );
}

async function showFormat(id) {
  selectedFormatId = id;
  renderFormatPicker();
  const f = await window.api.formats.get(id);
  if (!f || selectedFormatId !== id) return;
  const ul = (items) => (items.length ? `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '<div>—</div>');
  $('formatDetail').innerHTML = `<h3>${escapeHtml(f.title)}</h3>
    <div>${escapeHtml(f.use)}</div>
    <div class="k">Court / forum</div><div>${escapeHtml(f.forum)}</div>
    <div class="k">Law</div><div>${escapeHtml(f.law)}</div>
    <div class="k">Facts you will need</div>${ul(f.facts)}
    <div class="k">Usually filed with</div>${ul(f.annexures)}
    <div class="k">Format</div><pre>${escapeHtml(f.template)}</pre>`;
  $('useFormat').disabled = false;
}

$('chooseFormat').addEventListener('click', async () => {
  await catalogReady;
  $('formatSearch').value = '';
  const current = references.find((r) => r.builtin);
  selectedFormatId = current ? current.builtin : null;
  $('useFormat').disabled = !selectedFormatId;
  $('formatDetail').innerHTML = '<p class="hint">Choose a format on the left to see what it needs.</p>';
  renderFormatPicker();
  if (selectedFormatId) showFormat(selectedFormatId);
  formatsDlg.showModal();
  $('formatSearch').focus();
});
$('formatSearch').addEventListener('input', renderFormatPicker);
$('closeFormats').addEventListener('click', () => formatsDlg.close());

// Using a format: it becomes the matter's built-in template (replacing any
// earlier built-in one), its drafting notes join the format instructions, and
// an empty facts box gets its checklist to fill in.
$('useFormat').addEventListener('click', async () => {
  const f = await window.api.formats.get(selectedFormatId);
  if (!f) return;
  const previous = references.find((r) => r.builtin);
  references = references.filter((r) => !r.builtin);
  references.unshift({ name: `Format: ${f.title}`, text: f.template, ok: true, role: 'template', builtin: f.id });

  const notes = $('template');
  if (previous) {
    const old = formatCatalog.formats.find((x) => x.id === previous.builtin);
    const oldFull = old && (await window.api.formats.get(old.id));
    if (oldFull) notes.value = notes.value.replace(oldFull.instructions, '').trim();
  }
  if (!notes.value.includes(f.instructions)) notes.value = [notes.value.trim(), f.instructions].filter(Boolean).join('\n\n');

  if (!$('facts').value.trim()) {
    $('facts').value = f.facts.map((x) => `${x}: `).join('\n');
  }
  formatsDlg.close();
  renderRefs();
  setStatus(`Using “${f.title}”. Fill in the facts checklist, add documents, then generate.`, '');
});

function renderChecklist() {
  const box = $('formatChecklist');
  const ref = references.find((r) => r.builtin);
  const f = ref && formatCatalog.formats.find((x) => x.id === ref.builtin);
  if (!f) {
    box.hidden = true;
    return;
  }
  const li = (items) => items.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  box.innerHTML = `<span class="k">${escapeHtml(f.title)}</span> — facts this format needs:<ul>${li(f.facts)}</ul>` +
    (f.annexures.length ? `<span class="k">Usually filed with:</span><ul>${li(f.annexures)}</ul>` : '');
  box.hidden = false;
}
catalogReady.then(renderChecklist);

// ---------------------------------------------------------------------------
// Saved matters: autosaved a second after any change.
// ---------------------------------------------------------------------------
const M = window.api.matters;
let currentMatterId = null;
let lastCarryOver = [];
let saveTimer = null;
let applyingMatter = false; // opening a matter must not count as an edit
// Saves run one at a time. Each opened (or new) matter gets a new epoch, so a
// save that finishes after the advocate has switched matters still saves its
// own matter but cannot make it "current" again — otherwise later edits of the
// new matter would be written over the previous one.
let matterEpoch = 0;
let saveChain = Promise.resolve();

function matterIsEmpty() {
  return (
    !$('facts').value.trim() &&
    !$('template').value.trim() &&
    !$('draft').value.trim() &&
    !documents.length &&
    !references.length
  );
}

function snapshotMatter() {
  const keep = ({ name, text, ok, error, pages, ocrPages, confidence, translation, sourceId, aiPages, aiReadBy, useInDraft }) => ({
    name, text, ok, error, pages, ocrPages, confidence, translation, sourceId, aiPages, aiReadBy, useInDraft,
  });
  // Files still being read are saved once they finish.
  const done = (x) => !x.pending;
  return {
    id: currentMatterId,
    title: $('matterTitle').value.trim(),
    template: $('template').value,
    facts: $('facts').value,
    references: references.filter(done).map((r) => ({ ...keep(r), role: r.role, formatId: r.formatId, builtin: r.builtin })),
    documents: documents.filter(done).map(keep),
    budget: $('budget').value,
    includeNotes: $('includeNotes').checked,
    draft: $('draft').value,
    notesMarker,
    carryOver: lastCarryOver,
    usage: $('usage').textContent,
  };
}

function scheduleSave() {
  if (applyingMatter) return;
  clearTimeout(saveTimer);
  $('saveState').textContent = 'Unsaved changes…';
  saveTimer = setTimeout(saveNow, 1000);
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!currentMatterId && matterIsEmpty()) {
    $('saveState').textContent = '';
    return saveChain;
  }
  // Capture what to save now, while it is on screen.
  const epoch = matterEpoch;
  const snapshot = snapshotMatter();
  saveChain = saveChain.then(async () => {
    // A matter's first save creates it; later saves in the same epoch must
    // use the id that save returned, so it is never created twice.
    const id = epoch === matterEpoch ? currentMatterId : snapshot.id;
    try {
      const s = await M.save({ ...snapshot, id });
      if (epoch !== matterEpoch) return; // the advocate has moved on
      currentMatterId = s.id;
      if (!$('matterTitle').value.trim()) $('matterTitle').placeholder = s.title;
      $('saveState').textContent = `Saved ${new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (err) {
      if (epoch !== matterEpoch) return;
      $('saveState').textContent = '⚠ Not saved';
      setStatus(`Could not save the matter: ${err.message}`, 'err');
    }
  });
  return saveChain;
}

function applyMatter(m) {
  applyingMatter = true;
  matterEpoch++;
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    currentMatterId = m ? m.id : null;
    $('matterTitle').value = m && m.title !== 'Untitled matter' ? m.title : '';
    $('matterTitle').placeholder = 'Untitled matter — name it, e.g. Shetty v. Kumar (deposit refund)';
    $('template').value = (m && m.template) || '';
    $('facts').value = (m && m.facts) || '';
    references = (m && m.references) || [];
    documents = (m && m.documents) || [];
    if (m && m.budget) $('budget').value = m.budget;
    $('includeNotes').checked = m ? m.includeNotes !== false : true;
    $('draft').value = (m && m.draft) || '';
    notesMarker = (m && m.notesMarker) || '';
    $('usage').textContent = (m && m.usage) || '';
    renderRefs();
    renderDocs();
    renderCarryOver((m && m.carryOver) || []);
    const hasDraft = Boolean($('draft').value.trim());
    $('copyBtn').disabled = !hasDraft;
    $('exportBtn').disabled = !hasDraft;
    $('saveState').textContent = m ? `Saved ${new Date(m.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : '';
    setStatus('', '');
  } finally {
    applyingMatter = false;
  }
}

async function openMatter(id) {
  const res = await M.open(id);
  if (!res.ok) {
    setStatus(res.error, 'err');
    return false;
  }
  applyMatter(res.matter);
  return true;
}

// Switching matters is blocked mid-draft, and pending edits are saved first.
async function leaveCurrentMatter({ waitForSaves = false } = {}) {
  if (generating) {
    setStatus('Stop or finish the current draft before switching matters.', 'err');
    return false;
  }
  // Capture pending edits now; the save finishes in the background, safely,
  // because it belongs to this matter's epoch. Only when a matter is about to
  // be read back from disk (Open…) is it worth waiting for saves to finish.
  if (saveTimer) saveNow();
  if (waitForSaves) await saveChain;
  return true;
}

$('newMatter').addEventListener('click', async () => {
  if (!(await leaveCurrentMatter())) return;
  applyMatter(null);
  await M.clearLast();
  $('matterTitle').focus();
});

const mattersDlg = $('mattersDlg');
async function renderMatterList() {
  const q = $('matterSearch').value.trim().toLowerCase();
  const all = await M.list();
  const rows = all.filter((m) => !q || m.title.toLowerCase().includes(q));
  const list = $('matterList');
  if (!rows.length) {
    list.innerHTML = `<li class="empty">${all.length ? 'No matters match.' : 'No saved matters yet. A matter is saved as soon as you start typing.'}</li>`;
    return;
  }
  list.innerHTML = rows
    .map(
      (m) => `<li class="${m.id === currentMatterId ? 'current' : ''}">
        <div style="min-width:0"><div class="mt">${escapeHtml(m.title)}</div>
        <div class="md">Updated ${new Date(m.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div></div>
        <div class="ma">${m.id === currentMatterId ? '<span class="md">Open now</span>' : `<button class="ghost open" data-id="${m.id}">Open</button>`}
        <button class="ghost del" data-id="${m.id}" title="Delete this matter">Delete</button></div></li>`
    )
    .join('');
  list.querySelectorAll('.open').forEach((b) =>
    b.addEventListener('click', async () => {
      if (await openMatter(b.dataset.id)) mattersDlg.close();
    })
  );
  list.querySelectorAll('.del').forEach((b) =>
    b.addEventListener('click', async () => {
      const m = rows.find((x) => x.id === b.dataset.id);
      if (!confirm(`Delete “${m.title}”? Its facts, documents and draft are removed from this computer. This cannot be undone.`)) return;
      await M.remove(m.id);
      if (m.id === currentMatterId) applyMatter(null);
      renderMatterList();
    })
  );
}

$('openMatter').addEventListener('click', async () => {
  // The list and the matter opened are read from disk: let saves finish first.
  if (!(await leaveCurrentMatter({ waitForSaves: true }))) return;
  $('matterSearch').value = '';
  await renderMatterList();
  mattersDlg.showModal();
  $('matterSearch').focus();
});
$('matterSearch').addEventListener('input', renderMatterList);
$('closeMatters').addEventListener('click', () => mattersDlg.close());

// Anything the advocate changes is saved.
for (const id of ['matterTitle', 'template', 'facts', 'draft']) $(id).addEventListener('input', scheduleSave);
for (const id of ['budget', 'includeNotes']) $(id).addEventListener('change', scheduleSave);
window.addEventListener('beforeunload', () => {
  if (saveTimer) saveNow();
});

// Names, amounts and dates that may have leaked from a previous document.
function renderCarryOver(items) {
  lastCarryOver = items;
  const box = $('carryOver');
  if (!items.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const kinds = { name: 'name', number: 'number', date: 'date' };
  box.innerHTML =
    `<strong>⚠ Check for details carried over from the previous document.</strong> ` +
    `These appear in the draft and in the previous document, but not in this matter's facts or documents. ` +
    `Click one to find it in the draft.` +
    `<div class="chips">${items
      .map(
        (it, i) =>
          `<button class="chip" data-i="${i}" title="${escapeHtml(
            (it.context ? `“${it.context}” ` : '') + `in ${it.source}`
          )}">${escapeHtml(it.value)}<span class="k">${kinds[it.kind] || ''}</span></button>`
      )
      .join('')}</div>`;
  box.hidden = false;
  box.querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => findInDraft(items[Number(b.getAttribute('data-i'))].value))
  );
}

// Select the next occurrence of text in the draft, wrapping around.
function findInDraft(text) {
  const el = $('draft');
  const hay = el.value.toLowerCase();
  const needle = text.toLowerCase();
  let at = hay.indexOf(needle, el.selectionEnd);
  if (at < 0) at = hay.indexOf(needle);
  if (at < 0) return;
  el.focus();
  el.setSelectionRange(at, at + text.length);
  // Scroll the selection into view: measure the text above it.
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const linesAbove = el.value.slice(0, at).split('\n').length;
  el.scrollTop = Math.max(0, (linesAbove - 3) * lineHeight);
}

// The draft without the source-notes section, for copy/export.
function draftForFiling() {
  const text = $('draft').value;
  const i = notesMarker ? text.indexOf(notesMarker) : -1;
  return (i >= 0 ? text.slice(0, i) : text).trimEnd();
}

// ---------------------------------------------------------------------------
// Output actions
// ---------------------------------------------------------------------------
$('copyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(draftForFiling());
  setStatus('Draft copied to clipboard (source notes left out).', '');
});

$('exportBtn').addEventListener('click', async () => {
  const res = await window.api.exportDocx(draftForFiling(), 'advocate-draft.docx', $('wordFormat').value || null);
  if (!res.ok) {
    setStatus(`Export failed: ${res.error}`, 'err');
  } else if (!res.saved) {
    setStatus('Export cancelled.', '');
  } else if (res.keptHeaderFooter) {
    const hf = res.keptHeaderFooter.length > 140 ? `${res.keptHeaderFooter.slice(0, 140)}…` : res.keptHeaderFooter;
    setStatus(
      `Saved: ${res.filePath}, formatted as ${res.formatName}. Its header/footer was kept — “${hf}” — check it suits this matter.`,
      'warn'
    );
  } else {
    setStatus(`Saved: ${res.filePath}${res.formatName ? `, formatted as ${res.formatName}` : ''}.`, '');
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setStatus(msg, cls) {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status' + (cls ? ' ' + cls : '');
}
function setBusy(b) {
  generating = b;
  if (b) generationStarted = Date.now();
  else stopThinkingTimer();
  const btn = $('generateBtn');
  btn.textContent = b ? '■ Stop' : 'Generate draft';
  btn.classList.toggle('stop', b);
  // No editing while text is still arriving; it would be overwritten.
  $('draft').readOnly = b;
  if (b) {
    $('copyBtn').disabled = true;
    $('exportBtn').disabled = true;
  }
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Init: providers, then reopen the matter that was open last time.
loadProviders();
M.last().then((id) => id && openMatter(id));
updateWordFormats();
