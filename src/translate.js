'use strict';

// ---------------------------------------------------------------------------
// Document translation helpers
// ---------------------------------------------------------------------------
// Long documents are translated in parts so each fits comfortably in one
// response; parts break at paragraph boundaries so numbering and layout
// survive. The instructions come from the editable "Translation" prompt
// section, with {source} and {target} filled in.

const { LANGUAGES } = require('./ocr/pipeline');

const PART_CHARS = 6000;
const AUTO = 'auto';

const languageName = (code) => (code === AUTO ? null : LANGUAGES[code] || null);

// Split at blank lines; a paragraph longer than a part is cut at sentence
// ends (or hard-cut as a last resort).
function splitForTranslation(text, maxChars = PART_CHARS) {
  const paras = String(text).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const pieces = [];
  for (const p of paras) {
    if (p.length <= maxChars) {
      pieces.push(p);
      continue;
    }
    let rest = p;
    while (rest.length > maxChars) {
      const window = rest.slice(0, maxChars);
      let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('।'), window.lastIndexOf('\n'));
      if (cut < maxChars * 0.5) cut = window.lastIndexOf(' ');
      if (cut <= 0) cut = maxChars - 1;
      pieces.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) pieces.push(rest);
  }
  const parts = [];
  let buf = '';
  for (const piece of pieces) {
    if (buf && buf.length + piece.length + 2 > maxChars) {
      parts.push(buf);
      buf = '';
    }
    buf = buf ? `${buf}\n\n${piece}` : piece;
  }
  if (buf) parts.push(buf);
  return parts;
}

function translationSystemPrompt(template, { source, target }) {
  return template
    .replace(/\{source\}/g, languageName(source) || 'its original language (identify it yourself)')
    .replace(/\{target\}/g, languageName(target) || target);
}

function translationUserPrompt({ name, text, part, total }) {
  const head =
    total > 1
      ? `Document: ${name}\nThis is part ${part} of ${total}. Translate only this part; earlier parts are already translated. Do not add headings like "Part ${part}".`
      : `Document: ${name}`;
  return `${head}\n\n--- TEXT TO TRANSLATE ---\n${text}`;
}

// The translation as filed: a heading, the text, and a certificate block for
// the translator to complete and sign.
function translationForFiling({ name, source, target, text }) {
  const from = languageName(source) || '[ORIGINAL LANGUAGE]';
  const to = languageName(target) || target;
  return `${to.toUpperCase()} TRANSLATION OF ${String(name).replace(/\.[^.]+$/, '').toUpperCase()}
(Original in ${from})

${String(text).trim()}

CERTIFICATE OF TRANSLATION

I, [NAME OF TRANSLATOR], [QUALIFICATION / DESIGNATION], [ADDRESS], do hereby certify that the above is a true and correct ${to} translation of the original document in ${from}, to the best of my knowledge and ability.

Place: [PLACE]
Date: [DATE]

[SIGNATURE OF TRANSLATOR]`;
}

module.exports = {
  PART_CHARS,
  AUTO,
  languageName,
  splitForTranslation,
  translationSystemPrompt,
  translationUserPrompt,
  translationForFiling,
};
