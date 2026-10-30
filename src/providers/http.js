'use strict';

// Shared HTTP helpers for the providers that are called with fetch().

// An error whose message is already fit to show the advocate.
class ProviderError extends Error {
  constructor(message, { status, code, retryable = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

const isNetworkError = (err) =>
  /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|Connection error|network/i.test(
    String((err && err.message) || err) + String((err && err.cause && err.cause.code) || '')
  );

async function readBody(res) {
  const text = await res.text().catch(() => '');
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { text, json };
}

// fetch() that turns non-2xx responses into { status, json, text } errors for
// the caller to translate. Aborts propagate unchanged.
async function request(url, { method = 'GET', headers = {}, body, signal } = {}) {
  const res = await fetch(url, { method, headers, body, signal });
  if (!res.ok) {
    const { text, json } = await readBody(res);
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.json = json;
    err.text = text;
    throw err;
  }
  return res;
}

async function* lines(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      yield buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
    }
  }
  buf += decoder.decode();
  if (buf) yield buf.replace(/\r$/, '');
}

// Server-sent events: yields { event, data } per event; comment lines skipped.
async function* sseEvents(res) {
  let event = '';
  let data = [];
  for await (const line of lines(res)) {
    if (line === '') {
      if (data.length) yield { event: event || 'message', data: data.join('\n') };
      event = '';
      data = [];
    } else if (line.startsWith(':')) {
      continue;
    } else if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (data.length) yield { event: event || 'message', data: data.join('\n') };
}

// Newline-delimited JSON (Ollama).
async function* ndjson(res) {
  for await (const line of lines(res)) {
    if (line.trim()) yield JSON.parse(line);
  }
}

// Messages for the HTTP statuses every key-based provider shares.
function statusMessage(label, status, detail) {
  const d = detail ? ` (${detail})` : '';
  switch (status) {
    case 400: return `${label} rejected the request${d}.`;
    case 401: return `${label} rejected the API key. Check it under ⚙ AI providers.`;
    case 402: return `${label}: the account has run out of credit${d}.`;
    case 403: return `${label}: this key is not allowed to make this request${d}.`;
    case 404: return `${label}: the selected model is not available${d}. Pick another model.`;
    case 413: return `${label}: the request is too large. Choose a smaller context budget.`;
    case 429: return `${label}: rate limit or usage limit reached. Wait a minute and try again.`;
    case 529: return `${label} is temporarily overloaded. Try again shortly.`;
  }
  if (status >= 500) return `${label} had a server error. Try again shortly.`;
  return `${label} returned an error (HTTP ${status})${d}.`;
}

module.exports = { ProviderError, isNetworkError, request, sseEvents, ndjson, statusMessage };
