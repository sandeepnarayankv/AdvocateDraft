'use strict';

// Background process that reads PDFs / images (with OCR) so the app stays
// responsive and a malformed file cannot take down the main process.
// Runs as a Node child process (Electron's runtime in the app).
//
// In:  { type: 'read', id, filePath, kind: 'pdf' | 'image', langs, op?: 'images' }
//      (op 'images' returns page images for an AI model instead of OCR text)
//      { type: 'cancel', id }
// Out: { type: 'progress', id, page, total, ocr }
//      { type: 'done', id, result }  |  { type: 'error', id, message, cancelled }

const fs = require('fs');
const { createReader, summarise } = require('./pipeline');

const port = process.parentPort;
const send = (msg) => (port ? port.postMessage(msg) : process.send(msg));
const onMessage = (fn) =>
  port ? port.on('message', (e) => fn(e.data)) : process.on('message', fn);

const readers = new Map(); // languages key -> reader
const queue = [];
const controllers = new Map(); // job id -> AbortController
let busy = false;

function readerFor(langs) {
  const key = (langs || ['eng']).join('+');
  if (!readers.has(key)) readers.set(key, createReader({ langs }));
  return readers.get(key);
}

async function run(job) {
  const controller = controllers.get(job.id);
  try {
    const buffer = fs.readFileSync(job.filePath);
    const reader = readerFor(job.langs);
    const onProgress = (p) => send({ type: 'progress', id: job.id, ...p });
    if (job.op === 'images') {
      const pages = await reader.pageImages(buffer, job.kind, { onProgress, signal: controller.signal });
      send({ type: 'done', id: job.id, result: pages });
      return;
    }
    const pages =
      job.kind === 'image'
        ? await reader.readImage(buffer, { onProgress })
        : await reader.readPdf(buffer, { onProgress, signal: controller.signal });
    send({ type: 'done', id: job.id, result: summarise(pages) });
  } catch (err) {
    send({ type: 'error', id: job.id, message: String((err && err.message) || err), cancelled: Boolean(err && err.cancelled) });
  } finally {
    controllers.delete(job.id);
  }
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    if (controllers.get(job.id).signal.aborted) {
      send({ type: 'error', id: job.id, message: 'Reading was cancelled.', cancelled: true });
      controllers.delete(job.id);
      continue;
    }
    await run(job);
  }
  busy = false;
}

onMessage((msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'read') {
    controllers.set(msg.id, new AbortController());
    queue.push(msg);
    pump();
  } else if (msg.type === 'cancel') {
    const c = controllers.get(msg.id);
    if (c) c.abort();
  }
});
