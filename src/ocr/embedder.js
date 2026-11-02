'use strict';

// ---------------------------------------------------------------------------
// Local text embeddings for meaning-based search
// ---------------------------------------------------------------------------
// A small multilingual model (covers English and the Indian languages the
// app reads) turns passages into vectors. It runs in the background worker.
// The model is downloaded once, only when the advocate switches the feature
// on; afterwards remote loading is disabled so nothing else is fetched.

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const MODEL = 'Xenova/multilingual-e5-small';
const DTYPE = 'q8';
const BATCH = 16;

let lib = null;
let extractor = null;
let loadedFrom = null;

async function transformers() {
  if (!lib) lib = await import(pathToFileURL(require.resolve('@huggingface/transformers')).href);
  return lib;
}

// The quantised model file; its presence means the download completed.
const modelFile = (cacheDir) => path.join(cacheDir, ...MODEL.split('/'), 'onnx', 'model_quantized.onnx');
const isDownloaded = (cacheDir) => fs.existsSync(modelFile(cacheDir));

// download: allow fetching the model (first-time setup only).
// onProgress({ file, loaded, total }) while downloading.
async function load(cacheDir, { download = false, onProgress = () => {} } = {}) {
  if (extractor && loadedFrom === cacheDir) return extractor;
  const { pipeline, env } = await transformers();
  // Downloads land in cacheDir with the same layout as a local model folder,
  // so afterwards the model loads as a local model with remote access off.
  env.cacheDir = cacheDir;
  env.localModelPath = cacheDir;
  env.allowLocalModels = true;
  env.allowRemoteModels = download;
  extractor = await pipeline('feature-extraction', MODEL, {
    dtype: DTYPE,
    progress_callback: (p) => {
      if (p.status === 'progress' && p.total) onProgress({ file: p.file, loaded: p.loaded, total: p.total });
    },
  });
  loadedFrom = cacheDir;
  return extractor;
}

// kind 'query' or 'passage' (the model expects these prefixes).
// Returns unit-length vectors as plain arrays.
async function embed(cacheDir, texts, kind = 'passage') {
  if (!isDownloaded(cacheDir)) throw new Error('The meaning-based search model is not downloaded.');
  const run = await load(cacheDir);
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => `${kind}: ${String(t).replace(/\s+/g, ' ').trim()}`);
    const res = await run(batch, { pooling: 'mean', normalize: true });
    out.push(...res.tolist());
  }
  return out;
}

module.exports = { MODEL, isDownloaded, load, embed };
