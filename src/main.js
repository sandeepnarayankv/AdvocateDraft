'use strict';

const { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const providers = require('./providers');
const { ProviderError, isNetworkError } = require('./providers/http');
const { createStore } = require('./credentials');
const { createMatterStore } = require('./matters');
const formats = require('./formats');
const { createOcrService, nodeSpawner } = require('./ocr/service');
const { LANGUAGES, IMAGE_EXTS } = require('./ocr/pipeline');
const {
  languageName,
  splitForTranslation,
  translationSystemPrompt,
  translationUserPrompt,
  translationForFiling,
} = require('./translate');
const { createChatGptAuth } = require('./chatgpt-auth');
const { selectContext, renderContext, passagesToRank } = require('./rag');
const { createSemantic } = require('./semantic');
const { renderReferences, findCarryOver } = require('./precedent');
const { buildDocx } = require('./docx-export');
const {
  SOURCE_NOTES_MARKER,
  loadOverrides,
  saveOverrides,
  effectivePrompts,
  describePrompts,
  exportFile,
  parseImportFile,
  buildSystemPrompt,
  buildUserPrompt,
} = require('./prompts');

const isDev = process.argv.includes('--dev');

// ---------------------------------------------------------------------------
// Settings, secrets and AI providers
// ---------------------------------------------------------------------------
// Keys and ChatGPT tokens are encrypted with the OS keychain (credentials.js).
// The only network traffic is to the provider chosen for a draft.

const store = createStore({ dir: () => app.getPath('userData'), safeStorage });
const matters = createMatterStore({ dir: () => app.getPath('userData'), safeStorage });
const chatgptAuth = createChatGptAuth({ store, openExternal: (url) => shell.openExternal(url) });

// What a provider needs to make a call: an API key, a ChatGPT access token,
// or (Ollama) a local server address.
async function credentialsFor(provider) {
  if (provider.auth === 'oauth') return { secret: await chatgptAuth.getAccessToken() };
  if (provider.auth === 'local') return { baseUrl: store.getSetting(provider.id, 'baseUrl') || provider.defaultUrl };
  const secret = store.getSecret(provider.id);
  if (!secret) throw new ProviderError(`Add your ${provider.label} API key under ⚙ AI providers.`);
  return { secret };
}

function providerStatus(p) {
  const base = {
    id: p.id,
    label: p.label,
    auth: p.auth,
    keyUrl: p.keyUrl,
    keyPlaceholder: p.keyPlaceholder || '',
    privacy: p.privacy,
    model: store.getSetting(p.id, 'model') || p.defaultModel || '',
  };
  if (p.auth === 'oauth') {
    const s = chatgptAuth.status();
    return { ...base, configured: s.signedIn && s.planUsage, signedIn: s.signedIn, email: s.email, planUsage: s.planUsage };
  }
  if (p.auth === 'local') {
    return { ...base, configured: true, baseUrl: store.getSetting(p.id, 'baseUrl') || p.defaultUrl };
  }
  return { ...base, configured: store.hasSecret(p.id) };
}

// ---------------------------------------------------------------------------
// Document parsing (PDF / DOCX / plain text)
// ---------------------------------------------------------------------------
// Wrapped in try/catch so a missing/broken parser never crashes the app.

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  try {
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filePath));
      return { name, text: data.text.trim(), ok: true };
    }
    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const { value } = await mammoth.extractRawText({ path: filePath });
      return { name, text: value.trim(), ok: true };
    }
    if (['.txt', '.md', '.rtf', '.csv'].includes(ext)) {
      return { name, text: fs.readFileSync(filePath, 'utf8').trim(), ok: true };
    }
    return { name, text: '', ok: false, error: `Unsupported file type: ${ext}` };
  } catch (err) {
    return { name, text: '', ok: false, error: String(err && err.message || err) };
  }
}

// Scanned PDFs and images the advocate added, by id, for Read with AI. As with
// Word formats, the window only ever holds the id, never the path.
const sourceFiles = new Map(); // id -> { path, kind }
let nextSourceId = 1;
function registerSourceFile(filePath, kind) {
  const id = `s${nextSourceId++}`;
  sourceFiles.set(id, { path: filePath, kind });
  return id;
}

// PDFs and images are read in the background worker (text layer first, OCR
// for scanned pages). The entry returned now is a placeholder marked
// pending; progress and the result arrive as 'files:progress' / 'files:done'.
const ocr = createOcrService({ spawn: nodeSpawner() });
const semantic = createSemantic({ ocr, store, dataDir: () => app.getPath('userData') });
const ocrLangs = () => store.getSetting('ocr', 'langs') || ['eng', 'hin'];

async function readDocument(filePath, sender) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const kind = ext === '.pdf' ? 'pdf' : IMAGE_EXTS.includes(ext) ? 'image' : null;
  if (!kind) return extractText(filePath);

  const send = (ch, msg) => {
    if (!sender.isDestroyed()) sender.send(ch, msg);
  };
  const { id, promise } = ocr.read(filePath, kind, {
    langs: ocrLangs(),
    onProgress: (p) => send('files:progress', { jobId: id, ...p }),
  });
  // Kept so the pages can be sent to an AI model later (Read with AI).
  const sourceId = registerSourceFile(filePath, kind);
  promise
    .then((r) => {
      const found = Boolean(r.text);
      send('files:done', {
        jobId: id,
        result: {
          name,
          text: r.text,
          ok: found,
          error: found ? undefined : 'No readable text found, even with OCR.',
          pages: r.pages,
          ocrPages: r.ocrPages,
          confidence: r.confidence,
          sourceId,
        },
      });
    })
    .catch(async (err) => {
      if (err.cancelled) return send('files:done', { jobId: id, cancelled: true });
      // pdf.js could not open it: fall back to the simpler text extractor.
      const fallback = kind === 'pdf' ? await extractText(filePath) : { ok: false };
      send('files:done', {
        jobId: id,
        result: fallback.ok && fallback.text ? fallback : { name, text: '', ok: false, error: err.message },
      });
    });
  return { name, text: '', ok: false, pending: true, jobId: id };
}

// ---------------------------------------------------------------------------
// Prompt assembly + Claude call
// ---------------------------------------------------------------------------

// Everything sent to Claude for one draft. Shared by Generate and the prompt
// preview, so the preview is exactly what would be sent.
// promptOverrides: unsaved editor text, used only by the preview.
async function buildRequest({ template, references, facts, documents, budgetChars, includeNotes, promptOverrides }) {
  const prompts = effectivePrompts(promptOverrides || loadOverrides(app.getPath('userData')));
  const refs = (references || []).filter((r) => r.text && r.text.trim());
  const templateTexts = refs.filter((r) => r.role === 'template').map((r) => r.text).join('\n');
  const hasTemplate = Boolean(templateTexts);
  const hasPrecedent = refs.some((r) => r.role === 'precedent');
  const { templatesText, precedentsText } = renderReferences(refs);

  // Retrieval query: what the draft is about (facts) and what it must contain
  // (format + template headings). Previous documents are left out on purpose:
  // their facts belong to another matter and would skew retrieval.
  // Documents kept out of the draft (e.g. uploaded only to translate) are
  // never sent. Scanned ones are labelled so the model treats them with care.
  const docs = (documents || []).filter((d) => d.useInDraft !== false).map((d) =>
    d.aiPages
      ? { ...d, name: `${d.name} (handwritten / scanned — transcribed by AI from page images; names and figures may contain reading errors)` }
      : d.ocrPages
        ? { ...d, name: `${d.name} (scanned — text read by OCR; names and figures may contain recognition errors)` }
        : d
  );
  // When documents exceed the budget, passages are ranked by keyword and, if
  // meaning-based search is on, by meaning against the facts too.
  let meaningScore = null;
  try {
    meaningScore = await semantic.scorer(passagesToRank(docs, { budgetChars }), `${facts}\n${template}`);
  } catch (err) {
    console.warn('Meaning-based search unavailable, using keywords only:', err.message);
  }
  const context = selectContext(docs, `${facts}\n${template}\n${templateTexts}`, { budgetChars, meaningScore });

  return {
    refs,
    templateTexts,
    hasPrecedent,
    context,
    system: buildSystemPrompt(prompts, { includeNotes, mode: context.mode, hasTemplate, hasPrecedent }),
    user: buildUserPrompt(prompts, {
      instructions: template,
      templatesText,
      precedentsText,
      facts,
      contextText: renderContext(context),
    }),
  };
}

// The in-flight generation, so the UI can stop it. One at a time.
let activeGeneration = null;

async function generateDraft(payload, onText, onThinking = () => {}) {
  const { template, facts, documents, maxTokens } = payload;
  const provider = providers.get(payload.provider) || providers.get('anthropic');
  const model = payload.model || store.getSetting(provider.id, 'model') || provider.defaultModel;
  if (!model) throw new ProviderError(`Choose a model for ${provider.label} first.`);

  // Marked active before any await, so a second Generate is refused and Stop
  // works even while passages are still being ranked.
  const controller = new AbortController();
  const generation = { controller, cancelled: false };
  activeGeneration = generation;
  let resp;
  let refs, templateTexts, hasPrecedent, context;
  try {
    let system, user;
    ({ refs, templateTexts, hasPrecedent, context, system, user } = await buildRequest(payload));
    if (generation.cancelled) throw new Error('stopped');
    const creds = await credentialsFor(provider);
    store.setActive({ provider: provider.id, model });
    resp = await provider.stream({
      ...creds,
      model,
      system,
      user,
      maxTokens: maxTokens || 16000,
      signal: controller.signal,
      onText,
      onThinking,
    });
  } catch (err) {
    if (generation.cancelled) {
      const e = new Error('Generation stopped.');
      e.cancelled = true;
      throw e;
    }
    throw err;
  } finally {
    if (activeGeneration === generation) activeGeneration = null;
  }

  const text = resp.text;

  // Anything that legitimately describes this matter. The full source text is
  // used, not just the retrieved passages.
  const allowedText = [facts, template, templateTexts, ...(documents || []).map((d) => d.text || '')].join('\n');
  const carryOver = hasPrecedent ? findCarryOver({ draft: text, references: refs, allowedText }) : [];

  return {
    text,
    carryOver,
    usage: resp.usage || null,
    model: resp.model || model,
    provider: provider.id,
    providerLabel: provider.label,
    stopReason: resp.stopReason,
    context: { mode: context.mode, ...context.stats },
    notesMarker: SOURCE_NOTES_MARKER,
  };
}

// Translation of one document, part by part, with the chosen provider.
// onText receives translated text as it streams; onProgress({ part, total }).
let activeTranslation = null;

async function translateDocument({ name, text, source, target, provider: providerId, model: modelId }, { onText, onProgress }) {
  const provider = providers.get(providerId) || providers.get('anthropic');
  const model = modelId || store.getSetting(provider.id, 'model') || provider.defaultModel;
  if (!model) throw new ProviderError(`Choose a model for ${provider.label} first.`);
  if (!String(text || '').trim()) throw new ProviderError('This document has no text to translate.');

  const prompts = effectivePrompts(loadOverrides(app.getPath('userData')));
  const system = translationSystemPrompt(prompts.translate, { source, target });
  const parts = splitForTranslation(text);
  const controller = new AbortController();
  const job = { controller, cancelled: false };
  activeTranslation = job;
  const out = [];
  let truncatedParts = 0;
  try {
    const creds = await credentialsFor(provider);
    for (let i = 0; i < parts.length; i++) {
      onProgress({ part: i + 1, total: parts.length });
      if (i > 0) onText('\n\n');
      const resp = await provider.stream({
        ...creds,
        model,
        system,
        user: translationUserPrompt({ name, text: parts[i], part: i + 1, total: parts.length }),
        maxTokens: 12000,
        signal: controller.signal,
        onText,
      });
      if (resp.stopReason === 'max_tokens') truncatedParts++;
      out.push(resp.text);
    }
  } catch (err) {
    if (job.cancelled) {
      const e = new Error('Translation stopped.');
      e.cancelled = true;
      e.partial = out.join('\n\n');
      throw e;
    }
    throw err;
  } finally {
    if (activeTranslation === job) activeTranslation = null;
  }
  return { text: out.join('\n\n').trim(), parts: parts.length, truncatedParts, provider: provider.label, model };
}

// Read with AI: scanned / handwritten pages are sent as images to a vision
// model, one page at a time; pages with a text layer keep their text.
let activeAiRead = null;

async function readWithAi({ sourceId, provider: providerId, model: modelId }, { onProgress }) {
  const source = sourceFiles.get(sourceId);
  if (!source) throw new ProviderError('The original file is no longer available. Add it again to read it with AI.');
  if (!fs.existsSync(source.path)) throw new ProviderError('The original file has been moved or deleted. Add it again.');
  const provider = providers.get(providerId) || providers.get('anthropic');
  const model = modelId || store.getSetting(provider.id, 'model') || provider.defaultModel;
  if (!model) throw new ProviderError(`Choose a model for ${provider.label} first.`);

  const controller = new AbortController();
  const job = { controller, cancelled: false, readJob: null };
  activeAiRead = job;
  try {
    const creds = await credentialsFor(provider);
    onProgress({ stage: 'preparing' });
    const read = ocr.read(source.path, source.kind, { op: 'images' });
    job.readJob = read.id;
    const pages = await read.promise;
    const system = effectivePrompts(loadOverrides(app.getPath('userData'))).handwriting;
    const toRead = pages.filter((p) => p.image);
    let done = 0;
    let truncated = 0;
    for (const p of toRead) {
      if (controller.signal.aborted) break;
      onProgress({ stage: 'reading', page: ++done, total: toRead.length });
      const resp = await provider.stream({
        ...creds,
        model,
        system,
        user: `Transcribe page ${p.page} of the document.`,
        images: [p.image],
        maxTokens: 6000,
        signal: controller.signal,
        onText: () => {},
      });
      if (resp.stopReason === 'max_tokens') truncated++;
      p.text = resp.text.trim();
      p.image = null;
    }
    const text = pages.map((p) => p.text).filter(Boolean).join('\n\n').trim();
    return { text, pages: pages.length, aiPages: toRead.length, truncated, provider: provider.label, model };
  } catch (err) {
    if (job.cancelled) {
      const e = new Error('Reading stopped.');
      e.cancelled = true;
      throw e;
    }
    // A model that cannot read images usually says so with a 400.
    if (err instanceof ProviderError && err.status === 400) {
      throw new ProviderError(`${err.message} The selected model may not accept images — choose a vision-capable model.`, { status: 400 });
    }
    throw err;
  } finally {
    if (activeAiRead === job) activeAiRead = null;
  }
}

// Providers translate their own errors into plain-language ProviderErrors;
// anything else is reported as-is.
function friendlyError(err) {
  if (err instanceof ProviderError) return err.message;
  if (isNetworkError(err)) return 'Could not reach the AI service. Check your internet connection.';
  return String((err && err.message) || err);
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

// .docx templates / previous documents the advocate picked, by id. The window
// refers to them by id only, so it can never ask for an arbitrary file.
const formatFiles = new Map();
let nextFormatId = 1;

function registerFormatFile(filePath) {
  const id = `f${nextFormatId++}`;
  formatFiles.set(id, filePath);
  return id;
}

// formatId: a registered .docx to take formatting from, or null for the
// standard court format.
async function exportDocx(text, suggestedName, formatId) {
  let base = null;
  let formatName = null;
  if (formatId) {
    const p = formatFiles.get(formatId);
    if (!p) throw new Error('That formatting file is no longer available. Add it again.');
    try {
      base = fs.readFileSync(p);
    } catch {
      throw new Error(`Could not read ${path.basename(p)} — it may have been moved or deleted.`);
    }
    formatName = path.basename(p);
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export draft as Word document',
    defaultPath: suggestedName || 'draft.docx',
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });
  if (canceled || !filePath) return { saved: false };

  const { buffer, keptHeaderFooter } = await buildDocx(text, base);
  fs.writeFileSync(filePath, buffer);
  return { saved: true, filePath, formatName, keptHeaderFooter };
}

// ---------------------------------------------------------------------------
// IPC wiring
// ---------------------------------------------------------------------------

function registerIpc() {
  // AI providers
  const known = (id) => {
    const p = providers.get(id);
    if (!p) throw new Error(`Unknown provider: ${id}`);
    return p;
  };

  ipcMain.handle('providers:status', () => ({
    providers: providers.list.map(providerStatus),
    active: store.getActive(),
    encryptionAvailable: store.encryptionAvailable(),
  }));

  ipcMain.handle('providers:setKey', (_e, { id, key }) => {
    const p = known(id);
    if (p.auth !== 'key') throw new Error(`${p.label} does not use an API key.`);
    store.setSecret(id, String(key || '').trim() || null);
    return providerStatus(p);
  });

  ipcMain.handle('providers:setBaseUrl', (_e, { id, baseUrl }) => {
    const p = known(id);
    const url = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (url && !/^https?:\/\/[^\s/]+/i.test(url)) throw new Error('Enter an address like http://127.0.0.1:11434');
    store.setSetting(id, 'baseUrl', url || null);
    return providerStatus(p);
  });

  ipcMain.handle('providers:setActive', (_e, { provider, model }) => {
    known(provider);
    store.setActive({ provider, model });
    return store.getActive();
  });

  // Live model list. Also serves as the connection / key test.
  ipcMain.handle('providers:models', async (_e, id) => {
    const p = known(id);
    try {
      const models = await p.listModels(await credentialsFor(p));
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: friendlyError(err), models: p.fallbackModels };
    }
  });

  ipcMain.handle('chatgpt:signIn', async () => {
    try {
      const s = await chatgptAuth.signIn();
      return { ok: true, ...providerStatus(providers.get('chatgpt')), planUsage: s.planUsage };
    } catch (err) {
      return { ok: false, error: friendlyError(err) };
    }
  });

  ipcMain.handle('chatgpt:signOut', async () => {
    const { revoked } = await chatgptAuth.signOut();
    return { ok: true, revoked, ...providerStatus(providers.get('chatgpt')) };
  });

  ipcMain.handle('files:pick', async (e, kind) => {
    const isFormat = kind === 'template' || kind === 'precedent';
    const titles = {
      template: 'Select template file(s)',
      precedent: 'Select previous document(s) to use as reference',
      documents: 'Select source document(s) for this matter',
    };
    const images = IMAGE_EXTS.map((x) => x.slice(1));
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: titles[kind] || 'Select file(s)',
      properties: ['openFile', 'multiSelections'],
      filters: [
        isFormat
          ? { name: 'Documents and scans', extensions: ['docx', 'pdf', 'txt', 'md', ...images] }
          : { name: 'Documents and scans', extensions: ['pdf', 'docx', 'txt', 'md', 'rtf', 'csv', ...images] },
      ],
    });
    if (canceled) return [];
    const results = await Promise.all(filePaths.map((p) => readDocument(p, e.sender)));
    // Word files used for format can also lend their formatting to the export.
    if (isFormat) {
      results.forEach((r, i) => {
        if (r.ok && path.extname(filePaths[i]).toLowerCase() === '.docx') r.formatId = registerFormatFile(filePaths[i]);
      });
    }
    return results;
  });

  // Read with AI (handwriting / poor scans)
  ipcMain.handle('aiRead:run', async (e, payload) => {
    if (activeAiRead) return { ok: false, error: 'Another document is already being read with AI.' };
    try {
      const result = await readWithAi(payload, {
        onProgress: (p) => {
          if (!e.sender.isDestroyed()) e.sender.send('aiRead:progress', { sourceId: payload.sourceId, ...p });
        },
      });
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, cancelled: Boolean(err.cancelled), error: friendlyError(err) };
    }
  });

  ipcMain.handle('aiRead:cancel', () => {
    if (!activeAiRead) return { ok: false };
    activeAiRead.cancelled = true;
    activeAiRead.controller.abort();
    if (activeAiRead.readJob) ocr.cancel(activeAiRead.readJob);
    return { ok: true };
  });

  // Translation
  ipcMain.handle('translate:run', async (e, payload) => {
    if (activeTranslation) return { ok: false, error: 'A translation is already running.' };
    const send = (ch, msg) => {
      if (!e.sender.isDestroyed()) e.sender.send(ch, msg);
    };
    try {
      const result = await translateDocument(payload, {
        onText: (t) => send('translate:delta', t),
        onProgress: (p) => send('translate:progress', p),
      });
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, cancelled: Boolean(err.cancelled), partial: err.partial, error: friendlyError(err) };
    }
  });

  ipcMain.handle('translate:cancel', () => {
    if (!activeTranslation) return { ok: false };
    activeTranslation.cancelled = true;
    activeTranslation.controller.abort();
    return { ok: true };
  });

  ipcMain.handle('translate:export', async (_e, { name, source, target, text }) => {
    try {
      const base = String(name).replace(/\.[^.]+$/, '');
      const to = (languageName(target) || target).toLowerCase();
      const res = await exportDocx(translationForFiling({ name, source, target, text }), `${base} - ${to} translation.docx`, null);
      return { ok: true, ...res };
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  });

  ipcMain.handle('files:cancel', (_e, jobId) => {
    ocr.cancel(jobId);
    return { ok: true };
  });

  ipcMain.handle('ocr:settings', () => ({ langs: ocrLangs(), languages: LANGUAGES }));
  ipcMain.handle('ocr:setLangs', (_e, langs) => {
    const valid = (Array.isArray(langs) ? langs : []).filter((l) => LANGUAGES[l]);
    store.setSetting('ocr', 'langs', valid.length ? valid : null);
    return { langs: ocrLangs() };
  });

  ipcMain.handle('draft:generate', async (e, payload) => {
    if (activeGeneration) return { ok: false, error: 'A draft is already being generated.' };
    try {
      // Reasoning arrives in many small pieces; one "still thinking" signal a
      // second is enough for the window's progress line.
      let lastThinking = 0;
      const result = await generateDraft(
        payload,
        (delta) => {
          if (!e.sender.isDestroyed()) e.sender.send('draft:delta', delta);
        },
        () => {
          const now = Date.now();
          if (now - lastThinking < 1000 || e.sender.isDestroyed()) return;
          lastThinking = now;
          e.sender.send('draft:thinking');
        }
      );
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, cancelled: Boolean(err && err.cancelled), error: friendlyError(err) };
    }
  });

  // Saved matters. The window refers to Word-format files by id only, so ids
  // are swapped for paths when saving and re-registered when opening.
  const storeSource = ({ sourceId, ...d }) => {
    const s = sourceId && sourceFiles.get(sourceId);
    return s ? { ...d, sourcePath: s.path, sourceKind: s.kind } : d;
  };
  const openSource = ({ sourcePath, sourceKind, ...d }) =>
    sourcePath && fs.existsSync(sourcePath) ? { ...d, sourceId: registerSourceFile(sourcePath, sourceKind) } : d;
  const asStored = (m) => ({
    ...m,
    references: (m.references || []).map(({ formatId, ...r }) =>
      storeSource(formatId && formatFiles.has(formatId) ? { ...r, formatPath: formatFiles.get(formatId) } : r)
    ),
    documents: (m.documents || []).map(storeSource),
  });
  const asOpened = (m) => ({
    ...m,
    references: (m.references || []).map(({ formatPath, ...r }) =>
      openSource(formatPath && fs.existsSync(formatPath) ? { ...r, formatId: registerFormatFile(formatPath) } : r)
    ),
    documents: (m.documents || []).map(openSource),
  });

  // Built-in Indian formats
  ipcMain.handle('formats:list', () => ({ categories: formats.CATEGORIES, formats: formats.list() }));
  ipcMain.handle('formats:get', (_e, id) => formats.get(id) || null);

  ipcMain.handle('matters:list', () => matters.list());

  ipcMain.handle('matters:save', (_e, matter) => matters.save(asStored(matter)));

  ipcMain.handle('matters:open', (_e, id) => {
    try {
      return { ok: true, matter: asOpened(matters.get(id)) };
    } catch (err) {
      return { ok: false, error: `Could not open this matter: ${err.message}` };
    }
  });

  ipcMain.handle('matters:delete', (_e, id) => {
    matters.remove(id);
    return matters.list();
  });

  ipcMain.handle('matters:last', () => matters.lastOpened());

  ipcMain.handle('matters:clearLast', () => matters.clearLastOpened());

  // Prompt editor
  const dataDir = () => app.getPath('userData');

  ipcMain.handle('prompts:get', () => describePrompts(loadOverrides(dataDir())));

  ipcMain.handle('prompts:save', (_e, values) => {
    saveOverrides(dataDir(), values);
    return describePrompts(loadOverrides(dataDir()));
  });

  ipcMain.handle('prompts:preview', async (_e, payload) => {
    const { system, user, context } = await buildRequest(payload);
    return { system, user, chars: system.length + user.length, mode: context.mode, method: context.stats.method };
  });

  // Meaning-based search: status, one-time model download, on/off.
  ipcMain.handle('semantic:status', () => semantic.status());
  ipcMain.handle('semantic:enable', async (e) => {
    try {
      const s = await semantic.enable((p) => {
        if (!e.sender.isDestroyed()) e.sender.send('semantic:progress', p);
      });
      return { ok: true, ...s };
    } catch (err) {
      return { ok: false, error: `Could not download the model: ${friendlyError(err)}`, ...semantic.status() };
    }
  });
  ipcMain.handle('semantic:disable', () => semantic.disable());

  ipcMain.handle('prompts:export', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export prompts',
      defaultPath: 'advocate-draft-prompts.json',
      filters: [{ name: 'Prompts file', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { saved: false };
    fs.writeFileSync(filePath, exportFile(loadOverrides(dataDir())), 'utf8');
    return { saved: true, filePath };
  });

  // Reads a prompts file for the editor to show; nothing is saved until the
  // advocate presses Save.
  ipcMain.handle('prompts:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import prompts',
      properties: ['openFile'],
      filters: [{ name: 'Prompts file', extensions: ['json'] }],
    });
    if (canceled || !filePaths.length) return { ok: false, cancelled: true };
    try {
      const { overrides, unknown } = parseImportFile(fs.readFileSync(filePaths[0], 'utf8'));
      return { ok: true, sections: describePrompts(overrides), unknown };
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });

  ipcMain.handle('draft:cancel', () => {
    if (!activeGeneration) return { ok: false };
    activeGeneration.cancelled = true;
    activeGeneration.controller.abort();
    return { ok: true };
  });

  ipcMain.handle('draft:exportDocx', async (_e, { text, name, formatId }) => {
    try {
      return { ok: true, ...(await exportDocx(text, name, formatId)) };
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Advocate Draft',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  // Links (e.g. "get an API key") open in the system browser, never in the app.
  const openOutside = (url) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      openOutside(url);
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => ocr.stop());
