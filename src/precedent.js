'use strict';

// ---------------------------------------------------------------------------
// Format references: blank templates and previous documents (precedents)
// ---------------------------------------------------------------------------
// A template is followed exactly. A precedent is a document from an earlier
// matter used as a model for structure and language only; its facts must not
// reach the new draft. findCarryOver() flags names, amounts and dates that did.

// Combined size cap for all format references sent to the model.
const REFERENCE_BUDGET_CHARS = 120000;

function escapeAttr(s) {
  return String(s).replace(/"/g, "'");
}

// Trim precedents (never templates) to share the budget fairly.
function fitReferences(references, budgetChars = REFERENCE_BUDGET_CHARS) {
  const refs = references.filter((r) => r.text && r.text.trim());
  const templateChars = refs.filter((r) => r.role === 'template').reduce((s, r) => s + r.text.length, 0);
  const precedents = refs.filter((r) => r.role === 'precedent');
  const perPrecedent = precedents.length
    ? Math.max(4000, Math.floor((budgetChars - templateChars) / precedents.length))
    : 0;
  return refs.map((r) => {
    if (r.role !== 'precedent' || r.text.length <= perPrecedent) return { ...r, truncated: false };
    const cut = r.text.lastIndexOf('\n', perPrecedent);
    return { ...r, text: r.text.slice(0, cut > perPrecedent * 0.8 ? cut : perPrecedent), truncated: true };
  });
}

function renderReferences(references) {
  const fitted = fitReferences(references);
  const block = (role, tag) =>
    fitted
      .filter((r) => r.role === role)
      .map(
        (r) =>
          `<${tag} name="${escapeAttr(r.name)}">\n${r.text.trim()}` +
          (r.truncated ? '\n[… remainder of this document omitted for length …]' : '') +
          `\n</${tag}>`
      )
      .join('\n\n');
  return { templatesText: block('template', 'template'), precedentsText: block('precedent', 'previous_document') };
}

// ---------------------------------------------------------------------------
// Carry-over check
// ---------------------------------------------------------------------------

// Words that are capitalised in pleadings but are not names. Never flagged.
const COMMON = new Set(
  (
    'the a an and or of in on at to for by with from that this these those which who whom whose is are was were ' +
    'be been being has have had it its he she his her they them their we our you your not no as if under upon ' +
    'said such shall may will would should also all any each every further hence therefore thereof therein herein ' +
    'hereby whereas wherein whereby however moreover accordingly thus mr mrs ms smt shri sri dr kum km late son ' +
    'daughter wife husband aged years resident residing court hon\'ble honble honourable judge justice magistrate ' +
    'district civil criminal high supreme sessions family commercial tribunal bench principal senior junior division ' +
    'additional chief metropolitan city urban rural taluk plaintiff defendant petitioner respondent appellant ' +
    'applicant complainant accused opposite party parties advocate counsel versus vs before between prayer ' +
    'verification affidavit deponent plaint petition application appeal suit case matter original miscellaneous ' +
    'writ notice reply written statement schedule annexure exhibit document list index synopsis fact ground cause ' +
    'action jurisdiction limitation valuation fee relief interim decree order judgment section rule article act ' +
    'code procedure evidence contract india indian constitution state government union republic police station ' +
    'date dated place signature sd number rs rupees inr only lakh crore thousand hundred january february march ' +
    'april june july august september october november december monday tuesday wednesday thursday friday saturday ' +
    'sunday first second third fourth fifth para paragraph page true correct knowledge belief information solemnly ' +
    'affirm hereinafter called referred above named mentioned respectfully submitted humbly sheweth showeth most ' +
    'kindly pleased pass grant direct cost other deem fit proper circumstance interest equity counsel memo vakalat ' +
    // Document types, pleading words and common subject matter.
    'complaint wherefore cognizance punish memorandum vakalatnama objection rejoinder counter claim claimant ' +
    'arbitration arbitrator award execution caveat bail anticipatory revision review transfer injunction ' +
    'declaration possession partition specific performance recovery money damages compensation maintenance ' +
    'divorce custody guardianship probate succession testament lease rent tenancy eviction cheque bank loan ' +
    'agreement deed sale mortgage gift property land house building flat survey khata village hobli ward ' +
    'municipal corporation panchayat legal unpaid dishonour dishonoured endorsement insufficient fund drawer ' +
    'payee demand draft account branch manager director company limited private public trust society firm ' +
    'partner proprietor authorised signatory witness witnesses enclosure enclosures copy true attested ' +
    'notary oath commissioner registry registrar filing stamp duty'
  ).split(/\s+/)
);

function isCommon(word) {
  const l = word.toLowerCase().replace(/'s$/, '');
  return COMMON.has(l) || COMMON.has(l.replace(/e?s$/, ''));
}

const words = (text) => String(text).match(/[A-Za-z][A-Za-z']*/g) || [];

// Headings are often in capitals ("NEGOTIABLE INSTRUMENTS ACT"), so match any case.
const STATUTE_NAME_END = /\b(act|code|rules|regulations|sanhita|adhiniyam)$/i;
const STATUTE_NAME_AFTER = /^\s*(?:of\s+(?:the\s+)?(?:[A-Z][A-Za-z']*\s+)*)?(?:act|code|rules|regulations|sanhita|adhiniyam)\b/i;

// Capitalised words in the precedent that look like proper nouns: never
// written in lower case anywhere in the precedent or the draft (so "Further"
// or "Tenancy" are skipped), and not common legal vocabulary.
function nameCandidates(refText, draftText) {
  const lowerSeen = new Set();
  for (const w of [...words(refText), ...words(draftText)]) if (w === w.toLowerCase()) lowerSeen.add(w);
  const found = new Map(); // lowercase word -> phrase it appeared in
  const text = String(refText);
  for (const m of text.matchAll(/[A-Z][A-Za-z']*(?:[ \t]+[A-Z][A-Za-z']*)*/g)) {
    // Statute names ("Negotiable Instruments Act", "Transfer of Property Act")
    // are shared across matters, not facts of the old one.
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
    if (STATUTE_NAME_END.test(m[0]) || STATUTE_NAME_AFTER.test(after)) continue;
    for (const w of words(m[0])) {
      const l = w.toLowerCase();
      if (l.length < 3 || isCommon(w) || lowerSeen.has(l) || found.has(l)) continue;
      found.set(l, m[0].trim());
    }
  }
  return found;
}

// Statutory references ("Section 138", "Order VII Rule 11") are shared across
// matters, so their numbers are not flagged.
const STATUTORY_BEFORE = /(?:^|[^a-z])(section|sec|s|u\/s|order|rule|article|art|clause|regulation|reg|chapter)\.?\s*$/i;

function numberSet(text, { skipStatutory = false } = {}) {
  const out = new Map(); // normalised digits -> as written
  for (const m of String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0].replace(/[,.]+$/, '');
    const norm = raw.replace(/,/g, '');
    if (norm.split('.')[0].length < 3) continue;
    if (/^(18|19|20)\d\d$/.test(norm)) continue; // a year on its own
    if (skipStatutory && STATUTORY_BEFORE.test(text.slice(Math.max(0, m.index - 15), m.index))) continue;
    if (!out.has(norm)) out.set(norm, raw);
  }
  return out;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// Dates in common Indian formats, normalised to d-m-yyyy so "12.03.2023" and
// "12th March 2023" compare equal.
function dateSet(text) {
  const out = new Map();
  const add = (d, m, y, raw) => {
    d = Number(d); m = Number(m); y = Number(y);
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || !m || m > 12) return;
    const key = `${d}-${m}-${y}`;
    if (!out.has(key)) out.set(key, raw);
  };
  const s = String(text);
  for (const m of s.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/g)) add(m[1], m[2], m[3], m[0]);
  for (const m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?(?:\s+day\s+of)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g)) {
    add(m[1], MONTHS[m[2].slice(0, 3).toLowerCase()], m[3], m[0]);
  }
  for (const m of s.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) {
    add(m[2], MONTHS[m[1].slice(0, 3).toLowerCase()], m[3], m[0]);
  }
  return out;
}

// Items present in the draft and in a precedent, but absent from everything
// that legitimately describes this matter (facts, format, templates, sources).
function findCarryOver({ draft, references, allowedText, limit = 30 }) {
  const precedents = (references || []).filter((r) => r.role === 'precedent' && r.text);
  if (!draft || !precedents.length) return [];

  const draftWords = new Set(words(draft).map((w) => w.toLowerCase()));
  const allowedWords = new Set(words(allowedText).map((w) => w.toLowerCase()));
  const draftNums = numberSet(draft);
  const allowedNums = numberSet(allowedText);
  const draftDates = dateSet(draft);
  const allowedDates = dateSet(allowedText);

  const items = [];
  const seen = new Set();
  const push = (key, item) => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const ref of precedents) {
    // Group flagged words by the phrase they came from: "Ramesh Kumar", not two items.
    const byPhrase = new Map();
    for (const [l, phrase] of nameCandidates(ref.text, draft)) {
      if (!draftWords.has(l) || allowedWords.has(l)) continue;
      if (!byPhrase.has(phrase)) byPhrase.set(phrase, []);
      byPhrase.get(phrase).push(l);
    }
    for (const [phrase, flagged] of byPhrase) {
      const value = words(phrase).filter((w) => flagged.includes(w.toLowerCase())).join(' ');
      push(`name:${value.toLowerCase()}`, { kind: 'name', value, context: phrase.slice(0, 80), source: ref.name });
    }
    for (const [key] of dateSet(ref.text)) {
      if (draftDates.has(key) && !allowedDates.has(key)) {
        push(`date:${key}`, { kind: 'date', value: draftDates.get(key), source: ref.name });
      }
    }
    for (const [key] of numberSet(ref.text, { skipStatutory: true })) {
      if (draftNums.has(key) && !allowedNums.has(key)) {
        push(`num:${key}`, { kind: 'number', value: draftNums.get(key), source: ref.name });
      }
    }
  }
  return items.slice(0, limit);
}

module.exports = { REFERENCE_BUDGET_CHARS, fitReferences, renderReferences, findCarryOver, numberSet, dateSet };
