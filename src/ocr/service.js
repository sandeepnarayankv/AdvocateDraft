'use strict';

// Main-process side of document reading: starts the background worker on
// first use, routes progress and results to callers, restarts the worker if
// it dies, and cancels jobs.

const path = require('path');

const WORKER = path.join(__dirname, 'worker.js');

// spawn(scriptPath) -> { send(msg), onMessage(fn), onExit(fn), kill() }
function createOcrService({ spawn }) {
  let worker = null;
  let nextId = 1;
  const jobs = new Map(); // id -> { resolve, reject, onProgress }

  function ensureWorker() {
    if (worker) return worker;
    worker = spawn(WORKER);
    worker.onMessage((msg) => {
      const job = jobs.get(msg.id);
      if (!job) return;
      if (msg.type === 'progress') {
        const { type, id, ...p } = msg;
        job.onProgress(p);
      } else if (msg.type === 'done') {
        jobs.delete(msg.id);
        job.resolve(msg.result);
      } else if (msg.type === 'error') {
        jobs.delete(msg.id);
        const err = new Error(msg.message);
        err.cancelled = msg.cancelled;
        job.reject(err);
      }
    });
    worker.onExit(() => {
      worker = null;
      // Anything still running died with the worker.
      for (const [id, job] of jobs) {
        jobs.delete(id);
        job.reject(new Error('The document reader stopped unexpectedly. Try adding the file again.'));
      }
    });
    return worker;
  }

  // kind: 'pdf' | 'image'. op 'images' returns page images instead of OCR
  // text. Returns { id, promise }.
  function read(filePath, kind, { langs, onProgress = () => {}, op } = {}) {
    const id = nextId++;
    const promise = new Promise((resolve, reject) => {
      jobs.set(id, { resolve, reject, onProgress });
    });
    ensureWorker().send({ type: 'read', id, filePath, kind, langs, op });
    return { id, promise };
  }

  // Meaning-based search. Same queue as reading, so it never competes with OCR.
  function job(msg, onProgress = () => {}) {
    const id = nextId++;
    const promise = new Promise((resolve, reject) => {
      jobs.set(id, { resolve, reject, onProgress });
    });
    ensureWorker().send({ type: 'read', id, ...msg });
    return promise;
  }
  const setupEmbedder = (cacheDir, onProgress) => job({ op: 'embedSetup', cacheDir }, onProgress);
  const embed = (cacheDir, texts, kind) => job({ op: 'embed', cacheDir, texts, kind });

  function cancel(id) {
    if (worker && jobs.has(id)) worker.send({ type: 'cancel', id });
  }

  function stop() {
    if (worker) worker.kill();
    worker = null;
  }

  return { read, cancel, stop, setupEmbedder, embed };
}

// The worker runs as a plain Node process. Inside the Electron app that is
// Electron's own runtime started with ELECTRON_RUN_AS_NODE (an Electron
// "utility process" is not used: pdf.js treats it as a browser and cannot
// render there). Under plain Node the variable is simply ignored.
function nodeSpawner() {
  const { fork } = require('child_process');
  return (script) => {
    const child = fork(script, [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
    return {
      send: (msg) => child.send(msg),
      onMessage: (fn) => child.on('message', fn),
      onExit: (fn) => child.on('exit', fn),
      kill: () => child.kill(),
    };
  };
}

module.exports = { createOcrService, nodeSpawner };
