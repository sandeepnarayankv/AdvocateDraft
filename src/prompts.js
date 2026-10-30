'use strict';

// ---------------------------------------------------------------------------
// Editable prompts
// ---------------------------------------------------------------------------
// The system prompt is assembled from named sections. Each has a default; the
// advocate can override any of them from the Prompts dialog. Overrides are
// saved to prompts.json in the app's data folder (not secret, so not
// encrypted). The message layout (FORMAT / TEMPLATE / FACTS / SOURCES headings)
// and the source-notes marker line stay fixed: the app depends on them.

const fs = require('fs');
const path = require('path');

const SOURCE_NOTES_MARKER = '=== SOURCE NOTES (for advocate review — remove before filing) ===';
const FILE_VERSION = 1;
const MAX_SECTION_CHARS = 20000;

const SECTIONS = [
  {
    key: 'core',
    label: 'Core instructions',
    when: 'Always sent',
    default: [
      'You are an experienced legal drafting assistant for a practising advocate.',
      'Draft the requested legal document strictly from the CASE FACTS and SOURCE DOCUMENTS provided.',
      'Source documents are split into passages tagged like [D1-P3] (document 1, passage 3).',
      'Rules you must follow:',
      '- Follow the FORMAT INSTRUCTIONS — structure, headings, numbering, and style.',
      '- Use ONLY facts grounded in the case facts and source documents. Do not invent facts, dates, names, citations, or case law.',
      '- Where a required detail is missing, insert a clearly marked placeholder like [TO CONFIRM: ___] instead of guessing.',
      '- Do not put passage tags inside the draft itself; refer to documents the way a court draft would (e.g. Annexure A).',
      '- No preamble, no explanation, no markdown code fences.',
    ].join('\n'),
  },
  {
    key: 'template',
    label: 'Template rule',
    when: 'When a template file is added',
    default:
      '- A <template> is a blank format for this document. Reproduce its headings, numbering, order and fixed ' +
      'wording, and fill each blank or placeholder from this matter. Leave a blank as [TO CONFIRM: ___] if the ' +
      'material does not supply it.',
  },
  {
    key: 'precedent',
    label: 'Previous document rule',
    when: 'When a previous document is added',
    default: [
      '- A <previous_document> was drafted for a DIFFERENT matter. Use it only as a model: its structure, ' +
        'sequence of paragraphs, tone, standard averments, and the style of its prayer and verification. ' +
        'Never carry over its facts — party names, addresses, ages, dates, amounts, case or survey numbers, ' +
        "places, or events. Every fact in the new draft must come from this matter's case facts or source documents.",
      "- Reuse a statutory provision or legal ground from the previous document only if this matter's facts support it.",
    ].join('\n'),
  },
  {
    key: 'templateAndPrecedent',
    label: 'Template vs previous document',
    when: 'When both a template and a previous document are added',
    default: '- If a template and a previous document disagree on structure, follow the template.',
  },
  {
    key: 'partial',
    label: 'Partial documents rule',
    when: 'When documents are too long for the context budget and only passages are sent',
    default:
      '- You are seeing only the most relevant passages of long source documents, not their full text. ' +
      'If something the draft needs is not in the passages, use a [TO CONFIRM: ___] placeholder rather than assuming.',
  },
  {
    key: 'notes',
    label: 'Source notes',
    when: 'When “Add source notes” is ticked. The app adds the separator line before this text.',
    default:
      'List each factual paragraph of the draft with the passage tags it relies on, e.g. "Para 3 — D1-P2, D2-P7". ' +
      'Mark a paragraph that relies only on the stated case facts as "Para N — case facts", and standard text ' +
      'adapted from a previous document as "Para N — adapted from previous document". ' +
      'List every [TO CONFIRM] placeholder at the end.',
  },
  {
    key: 'noNotes',
    label: 'Output only',
    when: 'When “Add source notes” is not ticked',
    default: 'Return only the drafted document text.',
  },
  {
    key: 'task',
    label: 'Final task line',
    when: 'Last line of the message, after the facts and documents',
    default: 'Draft the document for THIS matter now, following every rule above.',
  },
  {
    key: 'translate',
    label: 'Translation instructions',
    when: 'When a document is translated (Translate). {source} and {target} are replaced with the languages chosen.',
    default: [
      'You are an experienced legal translator in India. Translate the document from {source} into {target}.',
      'Rules you must follow:',
      '- Translate completely and faithfully, sentence by sentence. Do not summarise, omit, add, explain or comment.',
      '- Keep the layout: paragraph breaks, numbering, headings, and table rows as separate lines.',
      '- Reproduce names of persons and places, numbers, amounts, dates, and survey, case, document and vehicle numbers exactly. Transliterate names; never translate their meaning.',
      '- Use precise legal terms. Where a term has no exact equivalent, give the closest legal term followed by the original word in brackets.',
      '- Where the text is illegible or garbled (for example by scanning errors), write [illegible] or [unclear: original text] instead of guessing.',
      '- Output only the translation, with no preamble and no markdown.',
    ].join('\n'),
  },
  {
    key: 'handwriting',
    label: 'Handwriting / scan reading instructions',
    when: 'When a page image is sent to the AI (Read with AI), one page at a time',
    default: [
      'You transcribe scanned and handwritten legal documents for an advocate in India.',
      'Transcribe ALL the text in the page image exactly as written, in its original language and script.',
      'Rules you must follow:',
      '- Do not translate, summarise, correct, complete or explain anything.',
      '- Keep the layout: line breaks, paragraphs, numbering, and table rows as separate lines.',
      '- Copy names, numbers, amounts, dates and survey, case and document numbers character for character.',
      '- Write [illegible] for anything you cannot read, and [unclear: your best reading] where you are not sure.',
      '- Note non-text marks in brackets: [signature], [thumb impression], [seal: text on the seal], [stamp: text], [struck out: text].',
      '- If the page is blank, reply [blank page].',
      '- Output only the transcription, with no preamble and no markdown.',
    ].join('\n'),
  },
];

const DEFAULTS = Object.fromEntries(SECTIONS.map((s) => [s.key, s.default]));

// Keep only known sections with non-empty text that differs from the default.
function cleanOverrides(raw) {
  const out = {};
  for (const s of SECTIONS) {
    const v = raw && raw[s.key];
    if (typeof v !== 'string') continue;
    const t = v.replace(/\r\n/g, '\n').trim().slice(0, MAX_SECTION_CHARS);
    if (t && t !== s.default) out[s.key] = t;
  }
  return out;
}

function promptsPath(dir) {
  return path.join(dir, 'prompts.json');
}

function loadOverrides(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(promptsPath(dir), 'utf8'));
    return cleanOverrides(data.overrides);
  } catch {
    return {};
  }
}

function saveOverrides(dir, raw) {
  const overrides = cleanOverrides(raw);
  fs.writeFileSync(promptsPath(dir), JSON.stringify({ version: FILE_VERSION, overrides }, null, 2), 'utf8');
  return overrides;
}

// Effective text per section: override if set, else default. An empty
// override means "use the default", so a section can't be blanked by accident.
function effectivePrompts(overrides) {
  return { ...DEFAULTS, ...cleanOverrides(overrides) };
}

// Section list for the editor UI.
function describePrompts(overrides) {
  const o = cleanOverrides(overrides);
  return SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    when: s.when,
    default: s.default,
    value: o[s.key] || s.default,
    custom: s.key in o,
  }));
}

// Shareable file: { app, version, prompts } with only the customised sections.
function exportFile(overrides) {
  return JSON.stringify({ app: 'advocate-draft', version: FILE_VERSION, prompts: cleanOverrides(overrides) }, null, 2);
}

function parseImportFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not a valid prompts file (could not read JSON).');
  }
  const prompts = data && (data.prompts || data.overrides);
  if (!prompts || typeof prompts !== 'object') throw new Error('Not an Advocate Draft prompts file.');
  const unknown = Object.keys(prompts).filter((k) => !(k in DEFAULTS));
  return { overrides: cleanOverrides(prompts), unknown };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function buildSystemPrompt(prompts, { includeNotes, mode, hasTemplate, hasPrecedent }) {
  const parts = [prompts.core];
  if (hasTemplate) parts.push(prompts.template);
  if (hasPrecedent) parts.push(prompts.precedent);
  if (hasTemplate && hasPrecedent) parts.push(prompts.templateAndPrecedent);
  if (mode === 'retrieved') parts.push(prompts.partial);
  if (includeNotes) {
    // The marker line is fixed: copy/export use it to strip the notes.
    parts.push(`After the draft, add a line reading exactly "${SOURCE_NOTES_MARKER}" and then:\n${prompts.notes}`);
  } else {
    parts.push(prompts.noNotes);
  }
  return parts.filter(Boolean).join('\n');
}

function buildUserPrompt(prompts, { instructions, templatesText, precedentsText, facts, contextText }) {
  const parts = [
    '## FORMAT INSTRUCTIONS',
    instructions ||
      (templatesText || precedentsText
        ? '(None beyond the template / previous document below.)'
        : '(No explicit format supplied — use a standard, professional format for this document type.)'),
  ];
  if (templatesText) parts.push('', '## TEMPLATE (follow exactly)', templatesText);
  if (precedentsText) {
    parts.push(
      '',
      '## PREVIOUS DOCUMENT FROM ANOTHER MATTER (model for structure and language only — its facts do NOT apply)',
      precedentsText
    );
  }
  parts.push(
    '',
    '## CASE FACTS (this matter)',
    facts || '(No facts supplied.)',
    '',
    '## SOURCE DOCUMENTS (this matter)',
    contextText || '(No source documents supplied.)',
    '',
    '## TASK',
    prompts.task
  );
  return parts.join('\n');
}

module.exports = {
  SOURCE_NOTES_MARKER,
  SECTIONS,
  DEFAULTS,
  loadOverrides,
  saveOverrides,
  effectivePrompts,
  describePrompts,
  exportFile,
  parseImportFile,
  buildSystemPrompt,
  buildUserPrompt,
};
