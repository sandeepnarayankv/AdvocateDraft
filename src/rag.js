'use strict';

// ---------------------------------------------------------------------------
// Local retrieval layer (no network, no model download)
// ---------------------------------------------------------------------------
// Documents are split into passage-sized chunks and ranked with BM25 against
// a query built from the case facts + output format. Lexical ranking suits
// legal material well: names, dates, section numbers and amounts are exact
// tokens. If everything fits within the context budget, all text is sent in
// order and nothing is dropped.

const STOPWORDS = new Set(
  ('a an and are as at be been but by for from had has have he her his i if in into is it its ' +
    'me my no not of on or our she so such that the their them then there these they this ' +
    'those to was we were what when where which who whom will with would you your shall may ' +
    'said also any all can do does did than other upon under over about after before being ' +
    'both each more most only same some very just own out up down off again further once')
    .split(/\s+/)
);

function tokenize(text) {
  const raw = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const out = [];
  for (let t of raw) {
    if (STOPWORDS.has(t)) continue;
    if (t.length < 2 && !/\d/.test(t)) continue;
    // Light plural folding: "agreements" ~ "agreement", but keep "witness".
    if (t.length > 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
    out.push(t);
  }
  return out;
}

// Split long text at sentence ends, falling back to a hard cut.
function splitLong(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('; '), window.lastIndexOf('\n'));
    if (cut < maxChars * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = maxChars;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) parts.push(rest.trim());
  return parts;
}

// Tail of a chunk carried into the next one so a passage cut mid-thought
// is still retrievable from either side.
function overlapTail(text, overlapChars) {
  if (!overlapChars || text.length <= overlapChars) return '';
  const tail = text.slice(-overlapChars);
  const sp = tail.indexOf(' ');
  return sp >= 0 ? tail.slice(sp + 1) : tail;
}

function chunkDocument(doc, docIndex, { targetChars = 1500, overlapChars = 200 } = {}) {
  const paragraphs = String(doc.text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .flatMap((p) => splitLong(p, targetChars));

  const chunks = [];
  let buf = '';
  let hasNew = false; // buf holds text beyond the carried-over overlap
  for (const p of paragraphs) {
    if (hasNew && buf.length + p.length + 2 > targetChars) {
      chunks.push(buf.trim());
      buf = overlapTail(buf, overlapChars);
      hasNew = false;
    }
    buf = buf ? `${buf}\n\n${p}` : p;
    hasNew = true;
  }
  if (hasNew && buf.trim()) chunks.push(buf.trim());

  const tag = `D${docIndex + 1}`;
  return chunks.map((text, seq) => ({
    id: `${tag}-P${seq + 1}`,
    docIndex,
    docName: doc.name,
    seq,
    text,
    terms: tokenize(text),
  }));
}

function bm25Scores(chunks, queryTerms, { k1 = 1.5, b = 0.75 } = {}) {
  const N = chunks.length;
  const avgLen = chunks.reduce((s, c) => s + c.terms.length, 0) / Math.max(N, 1);
  const df = new Map();
  for (const c of chunks) {
    for (const t of new Set(c.terms)) df.set(t, (df.get(t) || 0) + 1);
  }
  const uniqueQuery = [...new Set(queryTerms)];
  return chunks.map((c) => {
    const tf = new Map();
    for (const t of c.terms) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const q of uniqueQuery) {
      const f = tf.get(q);
      if (!f) continue;
      const n = df.get(q) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.terms.length) / (avgLen || 1))));
    }
    return score;
  });
}

// Decide what document text goes into the prompt.
//   documents: [{ name, text }]
//   query:     text describing what the draft needs (facts + format)
//   budgetChars: max characters of source material to send
function selectContext(documents, query, { budgetChars = 400000 } = {}) {
  const docs = documents.filter((d) => d.text && d.text.trim());
  const totalChars = docs.reduce((s, d) => s + d.text.length, 0);
  const mode = totalChars <= budgetChars ? 'full' : 'retrieved';

  // No overlap in full mode: it would only duplicate text.
  const chunks = docs.flatMap((d, i) =>
    chunkDocument(d, i, { overlapChars: mode === 'full' ? 0 : 200 })
  );

  let selected;
  if (mode === 'full') {
    selected = chunks;
  } else {
    const queryTerms = tokenize(query);
    const scores = bm25Scores(chunks, queryTerms);
    const picked = new Set();
    let used = 0;
    const take = (i) => {
      if (picked.has(i)) return;
      const len = chunks[i].text.length;
      if (used + len > budgetChars) return;
      picked.add(i);
      used += len;
    };
    // Opening passage of each document first: it usually names the parties,
    // the case/agreement number and the date.
    chunks.forEach((c, i) => { if (c.seq === 0) take(i); });
    // If the query had no usable terms every score is 0; fall back to reading
    // order rather than an arbitrary pick.
    const order = chunks
      .map((_, i) => i)
      .sort((a, b) => scores[b] - scores[a] || a - b);
    for (const i of order) {
      if (used >= budgetChars) break;
      take(i);
    }
    selected = chunks.filter((_, i) => picked.has(i));
  }

  // Group back by document, in reading order, for a coherent prompt.
  const blocks = docs.map((d, i) => ({
    docIndex: i,
    tag: `D${i + 1}`,
    docName: d.name,
    totalPassages: chunks.filter((c) => c.docIndex === i).length,
    passages: selected
      .filter((c) => c.docIndex === i)
      .sort((a, b) => a.seq - b.seq)
      .map(({ id, seq, text }) => ({ id, seq, text })),
  }));

  return {
    mode,
    blocks,
    stats: {
      documents: docs.length,
      totalChars,
      usedChars: selected.reduce((s, c) => s + c.text.length, 0),
      passagesTotal: chunks.length,
      passagesUsed: selected.length,
      budgetChars,
    },
  };
}

// Render the selected context as prompt text with stable passage tags.
function renderContext({ mode, blocks }) {
  return blocks
    .map((b) => {
      const header =
        mode === 'full'
          ? `--- SOURCE DOCUMENT ${b.tag}: ${b.docName} (complete) ---`
          : `--- SOURCE DOCUMENT ${b.tag}: ${b.docName} (${b.passages.length} of ${b.totalPassages} passages, most relevant) ---`;
      if (!b.passages.length) return `${header}\n(no passages selected)`;
      const body = [];
      b.passages.forEach((p, i) => {
        const prev = b.passages[i - 1];
        if (mode === 'retrieved' && prev && p.seq !== prev.seq + 1) body.push('[… passages omitted …]');
        body.push(`[${p.id}]\n${p.text}`);
      });
      return `${header}\n${body.join('\n\n')}`;
    })
    .join('\n\n');
}

module.exports = { tokenize, chunkDocument, bm25Scores, selectContext, renderContext };
