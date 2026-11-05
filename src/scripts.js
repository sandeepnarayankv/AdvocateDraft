'use strict';

// Writing systems of the languages the app reads, for checking that an AI
// transcription is in the scripts the advocate expects (a vision model can
// substitute one Indian script for another — e.g. Malayalam for Kannada —
// while inventing the text).

const RANGES = {
  Devanagari: [0x0900, 0x097f],
  Bengali: [0x0980, 0x09ff],
  Gurmukhi: [0x0a00, 0x0a7f],
  Gujarati: [0x0a80, 0x0aff],
  Odia: [0x0b00, 0x0b7f],
  Tamil: [0x0b80, 0x0bff],
  Telugu: [0x0c00, 0x0c7f],
  Kannada: [0x0c80, 0x0cff],
  Malayalam: [0x0d00, 0x0d7f],
  Arabic: [0x0600, 0x06ff],
};

// Language code (as used for OCR) -> script.
const SCRIPT_OF = {
  hin: 'Devanagari', mar: 'Devanagari', ben: 'Bengali', pan: 'Gurmukhi', guj: 'Gujarati',
  ori: 'Odia', tam: 'Tamil', tel: 'Telugu', kan: 'Kannada', mal: 'Malayalam', urd: 'Arabic',
};

// Indian / Arabic scripts present in text, with at least `min` characters.
function scriptsIn(text, min = 3) {
  const counts = {};
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    for (const [name, [lo, hi]] of Object.entries(RANGES)) {
      if (cp >= lo && cp <= hi) {
        counts[name] = (counts[name] || 0) + 1;
        break;
      }
    }
  }
  return Object.keys(counts).filter((s) => counts[s] >= min);
}

// Scripts in the text that none of the expected languages use.
function unexpectedScripts(text, langs) {
  const expected = new Set((langs || []).map((l) => SCRIPT_OF[l]).filter(Boolean));
  return scriptsIn(text).filter((s) => !expected.has(s));
}

// Cross-check an AI transcription against the earlier OCR text, script by
// script. Printed Indian-script text is often read better by OCR than by a
// vision model, which may write plausible but different words in the right
// script. Returns, per Indian script, the share of OCR words the AI also has
// and a short sample of each version when they mostly disagree.
const JOINERS = /[​-‍﻿]/g;
const MIN_AGREEMENT = 0.75;

function wordsInScript(text, script) {
  const [lo, hi] = RANGES[script];
  return String(text)
    .replace(JOINERS, '')
    .split(/[\s.,;:()\-–—|"'/]+/)
    .filter((w) => [...w].some((ch) => {
      const cp = ch.codePointAt(0);
      return cp >= lo && cp <= hi;
    }));
}

function linesInScript(text, script) {
  return String(text).replace(JOINERS, '').split('\n').filter((l) => wordsInScript(l, script).length).map((l) => l.trim());
}

function compareWithOcr(aiText, ocrText) {
  const out = [];
  for (const script of scriptsIn(ocrText)) {
    const ocrWords = wordsInScript(ocrText, script);
    if (ocrWords.length < 2) continue;
    const aiWords = new Set(wordsInScript(aiText, script));
    const agree = ocrWords.filter((w) => aiWords.has(w)).length / ocrWords.length;
    if (agree < MIN_AGREEMENT) {
      out.push({
        script,
        agreement: Math.round(agree * 100),
        ocr: linesInScript(ocrText, script).slice(0, 2).join(' / ').slice(0, 160),
        ai: linesInScript(aiText, script).slice(0, 2).join(' / ').slice(0, 160) || '(none)',
      });
    }
  }
  return out;
}

module.exports = { scriptsIn, unexpectedScripts, compareWithOcr, SCRIPT_OF };
