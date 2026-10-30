'use strict';

// ---------------------------------------------------------------------------
// Reading PDFs and images, with OCR for scanned pages
// ---------------------------------------------------------------------------
// Runs entirely on this computer. For a PDF, each page's text layer is used
// when it has one; pages with (almost) no text are rendered to an image and
// read with Tesseract. Images are read with Tesseract directly. Language
// data is bundled (npm @tesseract.js-data/*), so nothing is downloaded.

const fs = require('fs');
const os = require('os');
const path = require('path');

// Below this many characters a page is treated as scanned.
const MIN_TEXT_CHARS = 25;
// ~300 DPI, capped so very large pages don't exhaust memory.
const RENDER_SCALE = 300 / 72;
const MAX_RENDER_PIXELS = 4200;
// Page images sent to an AI model: legible for handwriting, small to upload.
const AI_IMAGE_MAX_PX = 2000;

const LANGUAGES = {
  eng: 'English',
  hin: 'Hindi',
  kan: 'Kannada',
  tam: 'Tamil',
  tel: 'Telugu',
  mar: 'Marathi',
  ben: 'Bengali',
  guj: 'Gujarati',
  mal: 'Malayalam',
  pan: 'Punjabi',
  ori: 'Odia',
  urd: 'Urdu',
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];

class Cancelled extends Error {
  constructor() {
    super('Reading was cancelled.');
    this.cancelled = true;
  }
}

// Each language pack ships as <lang>/4.0.0_best_int/<lang>.traineddata.gz.
function langDir(lang) {
  return path.join(path.dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`)), '4.0.0_best_int');
}

function validLangs(langs) {
  const list = (langs || ['eng']).filter((l) => LANGUAGES[l]);
  return list.length ? list : ['eng'];
}

// Tesseract loads every language from one folder, so point it at a small
// cache folder of copies when several languages are used.
function langPathFor(langs) {
  if (langs.length === 1) return langDir(langs[0]);
  const dir = path.join(os.tmpdir(), 'advocate-draft-ocr-langs');
  fs.mkdirSync(dir, { recursive: true });
  for (const l of langs) {
    const dest = path.join(dir, `${l}.traineddata.gz`);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(langDir(l), `${l}.traineddata.gz`), dest);
  }
  return dir;
}

function createReader({ langs } = {}) {
  const languages = validLangs(langs);
  let worker = null;
  let pdfjs = null;

  async function ocrWorker() {
    if (!worker) {
      const { createWorker, OEM } = require('tesseract.js');
      worker = await createWorker(languages.join('+'), OEM.LSTM_ONLY, {
        langPath: langPathFor(languages),
        cacheMethod: 'none',
        gzip: true,
      });
    }
    return worker;
  }

  async function ocrImage(image) {
    const w = await ocrWorker();
    const { data } = await w.recognize(image);
    return { text: cleanOcrText(data.text || ''), confidence: Math.round(data.confidence || 0) };
  }

  async function loadPdfjs() {
    if (!pdfjs) pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjs;
  }

  // onProgress({ page, total, ocr }) after each page.
  async function readPdf(buffer, { onProgress = () => {}, signal } = {}) {
    const lib = await loadPdfjs();
    // isEvalSupported:false closes the code-execution path used by malicious PDFs.
    const task = lib.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    });
    const doc = await task.promise;
    const pages = [];
    try {
      for (let n = 1; n <= doc.numPages; n++) {
        if (signal && signal.aborted) throw new Cancelled();
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        let text = joinTextItems(content.items);
        let ocr = false;
        let confidence = null;
        if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
          const png = await renderPage(doc, page);
          if (signal && signal.aborted) throw new Cancelled();
          const res = await ocrImage(png);
          if (res.text.replace(/\s/g, '').length > text.replace(/\s/g, '').length) {
            text = res.text;
            ocr = true;
            confidence = res.confidence;
          }
        }
        page.cleanup();
        pages.push({ page: n, text, ocr, confidence });
        onProgress({ page: n, total: doc.numPages, ocr });
      }
    } finally {
      await task.destroy();
    }
    return pages;
  }

  async function renderPage(doc, page) {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(RENDER_SCALE, MAX_RENDER_PIXELS / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const { canvas, context } = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    // White background: scanned pages often have transparent areas.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const png = canvas.toBuffer('image/png');
    doc.canvasFactory.destroy({ canvas, context });
    return png;
  }

  // Page images for an AI vision model (handwriting). PDF pages with a text
  // layer keep their text and send no image; scanned pages and photos become
  // JPEGs no larger than AI_IMAGE_MAX_PX on the long edge.
  async function pageImages(buffer, kind, { onProgress = () => {}, signal } = {}) {
    if (kind === 'image') {
      const { loadImage } = require('@napi-rs/canvas');
      const img = await loadImage(buffer);
      onProgress({ page: 1, total: 1 });
      return [{ page: 1, text: '', image: toJpeg(img, img.width, img.height) }];
    }
    const lib = await loadPdfjs();
    const task = lib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true, verbosity: 0 });
    const doc = await task.promise;
    const out = [];
    try {
      for (let n = 1; n <= doc.numPages; n++) {
        if (signal && signal.aborted) throw new Cancelled();
        const page = await doc.getPage(n);
        const text = joinTextItems((await page.getTextContent()).items);
        if (text.replace(/\s/g, '').length >= MIN_TEXT_CHARS) {
          out.push({ page: n, text, image: null });
        } else {
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: AI_IMAGE_MAX_PX / Math.max(base.width, base.height) });
          const { canvas, context } = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          out.push({ page: n, text: '', image: { mediaType: 'image/jpeg', data: canvas.toBuffer('image/jpeg', 85).toString('base64') } });
          doc.canvasFactory.destroy({ canvas, context });
        }
        page.cleanup();
        onProgress({ page: n, total: doc.numPages });
      }
    } finally {
      await task.destroy();
    }
    return out;
  }

  async function readImage(buffer, { onProgress = () => {} } = {}) {
    const res = await ocrImage(buffer);
    onProgress({ page: 1, total: 1, ocr: true });
    return [{ page: 1, text: res.text, ocr: true, confidence: res.confidence }];
  }

  async function close() {
    if (worker) await worker.terminate();
    worker = null;
  }

  return { readPdf, readImage, pageImages, close, languages };
}

// Scale an image so its long edge is at most AI_IMAGE_MAX_PX; encode as JPEG.
function toJpeg(img, width, height) {
  const { createCanvas } = require('@napi-rs/canvas');
  const scale = Math.min(1, AI_IMAGE_MAX_PX / Math.max(width, height));
  const canvas = createCanvas(Math.round(width * scale), Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { mediaType: 'image/jpeg', data: canvas.toBuffer('image/jpeg', 85).toString('base64') };
}

// Fix OCR slips that matter in legal text, conservatively:
//  - digit groups read with dots ("2.70.000") are amounts, never decimals
//    (a decimal has one point), so restore the commas: "2,70,000";
//  - a "|" opening a line before a word is the capital letter I (mid-line
//    "|" is left alone: tables use it as a separator).
function cleanOcrText(text) {
  return text
    .replace(/\b\d{1,3}(?:\.\d{2,3}){2,}\b/g, (m) => m.replace(/\./g, ','))
    .replace(/^\|(?=\s+[a-z])/gm, 'I')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Rebuild lines from pdf.js text items (hasEOL marks line ends).
function joinTextItems(items) {
  let out = '';
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    out += it.str;
    if (it.hasEOL) out += '\n';
  }
  return out.replace(/[ \t]+\n/g, '\n').trim();
}

// Combine pages into one document text, with a short summary of how it was read.
function summarise(pages) {
  const ocrPages = pages.filter((p) => p.ocr);
  const conf = ocrPages.length
    ? Math.round(ocrPages.reduce((s, p) => s + (p.confidence || 0), 0) / ocrPages.length)
    : null;
  return {
    text: pages.map((p) => p.text).filter(Boolean).join('\n\n').trim(),
    pages: pages.length,
    ocrPages: ocrPages.length,
    confidence: conf,
    emptyPages: pages.filter((p) => !p.text.replace(/\s/g, '')).length,
  };
}

module.exports = { createReader, summarise, cleanOcrText, LANGUAGES, IMAGE_EXTS, MIN_TEXT_CHARS, Cancelled };
