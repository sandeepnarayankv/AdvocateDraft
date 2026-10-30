'use strict';

// ---------------------------------------------------------------------------
// Word export
// ---------------------------------------------------------------------------
// The draft is written into a base .docx: either the advocate's own template
// or previous document (keeping its page setup, margins, header/footer and
// body font), or a generated standard court format. Only the body is replaced.
// Layout comes from the draft text: all-caps lines become centred bold
// headings, "1." paragraphs get a hanging indent, [TO CONFIRM] is highlighted.

const JSZip = require('jszip');

const STANDARD_FORMAT = {
  label: 'Standard court format (A4, Times New Roman 12, 1.5 spacing)',
  font: 'Times New Roman',
  size: 24, // half-points
  line: 360, // 240ths of a line: 1.5
  jc: 'both',
};

// ---- draft text -> paragraph model -----------------------------------------

const NUMBERED = /^(\(?(?:\d{1,3}|[a-z]|[ivxlc]{1,6})[.)])\s+(.*)$/i;
const CENTRED = /^(?:versus|vs\.?|v\/s\.?|v\.|-+\s*vs\.?\s*-+|and)$/i;

function classifyLines(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((raw) => {
      const line = raw.replace(/\s+$/, '');
      const t = line.trim();
      if (!t) return { kind: 'blank' };
      const letters = t.replace(/[^A-Za-z]/g, '');
      if (letters.length >= 3 && letters === letters.toUpperCase() && t.length <= 160) {
        return { kind: 'heading', text: t };
      }
      if (CENTRED.test(t)) return { kind: 'centre', text: t };
      const m = t.match(NUMBERED);
      // Roman-looking single letters ("I am…") are only numbers when followed by "." or ")".
      if (m) return { kind: 'numbered', number: m[1], text: m[2] };
      return { kind: 'body', text: t };
    });
}

// ---- XML builders -----------------------------------------------------------

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function runPropsXml(fmt, { bold = false, highlight = false } = {}) {
  const p = [];
  if (fmt.font) p.push(`<w:rFonts w:ascii="${esc(fmt.font)}" w:hAnsi="${esc(fmt.font)}" w:cs="${esc(fmt.font)}"/>`);
  if (bold) p.push('<w:b/><w:bCs/>');
  if (fmt.size) p.push(`<w:sz w:val="${fmt.size}"/><w:szCs w:val="${fmt.size}"/>`);
  if (highlight) p.push('<w:highlight w:val="yellow"/>');
  return p.length ? `<w:rPr>${p.join('')}</w:rPr>` : '';
}

function textRun(text, fmt, opts) {
  const parts = String(text).split('\t');
  const body = parts
    .map((part, i) => (i ? '<w:tab/>' : '') + (part ? `<w:t xml:space="preserve">${esc(part)}</w:t>` : ''))
    .join('');
  return body ? `<w:r>${runPropsXml(fmt, opts)}${body}</w:r>` : '';
}

// Splits on **bold** (in case the model used it) and [TO CONFIRM…] markers.
function runsXml(text, fmt, { bold = false } = {}) {
  let out = '';
  for (const seg of String(text).split(/(\*\*[^*]+\*\*|\[TO CONFIRM[^\]]*\])/i)) {
    if (!seg) continue;
    if (/^\*\*[^*]+\*\*$/.test(seg)) out += textRun(seg.slice(2, -2), fmt, { bold: true });
    else if (/^\[TO CONFIRM/i.test(seg)) out += textRun(seg, fmt, { bold, highlight: true });
    else out += textRun(seg, fmt, { bold });
  }
  return out;
}

function paragraphXml(item, fmt) {
  const spacing = `<w:spacing w:before="0" w:after="0"${fmt.line ? ` w:line="${fmt.line}" w:lineRule="auto"` : ''}/>`;
  switch (item.kind) {
    case 'blank':
      return `<w:p><w:pPr>${spacing}</w:pPr></w:p>`;
    case 'heading':
      return `<w:p><w:pPr><w:keepNext/>${spacing}<w:jc w:val="center"/></w:pPr>${runsXml(item.text, fmt, { bold: true })}</w:p>`;
    case 'centre':
      return `<w:p><w:pPr>${spacing}<w:jc w:val="center"/></w:pPr>${runsXml(item.text, fmt)}</w:p>`;
    case 'numbered':
      return (
        `<w:p><w:pPr>${spacing}<w:ind w:left="720" w:hanging="720"/>${fmt.jc ? `<w:jc w:val="${fmt.jc}"/>` : ''}</w:pPr>` +
        `${runsXml(`${item.number}\t${item.text}`, fmt)}</w:p>`
      );
    default:
      return `<w:p><w:pPr>${spacing}${fmt.jc ? `<w:jc w:val="${fmt.jc}"/>` : ''}</w:pPr>${runsXml(item.text, fmt)}</w:p>`;
  }
}

// ---- reading a base document ------------------------------------------------

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best;
  let bestN = 0;
  for (const [v, n] of counts) if (n > bestN) [best, bestN] = [v, n];
  return best;
}

// The formatting the base document's body mostly uses. Fields it doesn't set
// directly are left undefined so its styles apply.
function dominantFormatting(documentXml) {
  const all = (re) => [...documentXml.matchAll(re)].map((m) => m[1]);
  const jc = mode(all(/<w:pPr>(?:(?!<\/w:pPr>)[\s\S])*?<w:jc w:val="(\w+)"/g).filter((v) => v !== 'center' && v !== 'right'));
  const size = mode(all(/<w:sz w:val="(\d+)"/g));
  const line = mode(all(/<w:spacing\b[^>]*\bw:line="(\d+)"/g));
  return {
    font: mode(all(/<w:rFonts\b[^>]*\bw:ascii="([^"]+)"/g)),
    size: size ? Number(size) : undefined,
    line: line ? Number(line) : undefined,
    jc: jc === 'both' || jc === 'distribute' ? 'both' : jc,
  };
}

const xmlText = (xml) =>
  xml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n').map((l) => l.trim()).filter(Boolean).join(' / ');

// Text of headers and footers kept from the base document, so the advocate can
// check none of it belongs to the old matter.
async function headerFooterText(zip) {
  const names = Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n)).sort();
  const texts = [];
  for (const n of names) {
    const t = xmlText(await zip.file(n).async('string'));
    if (t && !texts.includes(t)) texts.push(t);
  }
  return texts.join(' / ');
}

// Replace everything in <w:body> except its final section properties (page
// size, margins, header/footer references).
function replaceBody(documentXml, paragraphs) {
  const open = documentXml.search(/<w:body\b[^>]*>/);
  const close = documentXml.lastIndexOf('</w:body>');
  if (open < 0 || close < 0) throw new Error('This Word file has no document body.');
  const openEnd = documentXml.indexOf('>', open) + 1;
  const body = documentXml.slice(openEnd, close);

  let sectPr = '';
  const s = body.lastIndexOf('<w:sectPr');
  if (s >= 0) {
    const selfClose = body.indexOf('/>', s);
    const gt = body.indexOf('>', s);
    const end = selfClose >= 0 && selfClose < gt ? selfClose + 2 : body.indexOf('</w:sectPr>', s) + '</w:sectPr>'.length;
    // Only the body-level sectPr (not one inside a paragraph's section break).
    if (!/<\/w:p>/.test(body.slice(end))) sectPr = body.slice(s, end);
  }
  return documentXml.slice(0, openEnd) + paragraphs + sectPr + documentXml.slice(close);
}

// Clear descriptive metadata that may name the old matter.
async function scrubMetadata(zip) {
  const core = zip.file('docProps/core.xml');
  if (!core) return;
  let xml = await core.async('string');
  for (const tag of ['dc:title', 'dc:subject', 'dc:description', 'cp:keywords', 'cp:category', 'dc:creator', 'cp:lastModifiedBy']) {
    xml = xml.replace(new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?</${tag}>`, 'g'), `<${tag}$1></${tag}>`);
  }
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  xml = xml.replace(/(<dcterms:modified\b[^>]*>)[^<]*(<\/dcterms:modified>)/, `$1${now}$2`);
  zip.file('docProps/core.xml', xml);
}

// ---- standard base document -------------------------------------------------

async function standardBase() {
  const { Document, Packer, Paragraph, TextRun, Footer, AlignmentType, PageNumber } = require('docx');
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: STANDARD_FORMAT.font, size: STANDARD_FORMAT.size },
          paragraph: { spacing: { before: 0, after: 0, line: STANDARD_FORMAT.line } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            // 1.5" left for binding, 1" elsewhere.
            margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })],
          }),
        },
        children: [new Paragraph('')],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// ---- entry point ------------------------------------------------------------

// baseBuffer: contents of a .docx to take formatting from, or null for the
// standard format. Returns { buffer, keptHeaderFooter, format }.
async function buildDocx(text, baseBuffer) {
  const zip = await JSZip.loadAsync(baseBuffer || (await standardBase()));
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Not a Word document (.docx).');
  const documentXml = await docFile.async('string');

  const format = baseBuffer ? dominantFormatting(documentXml) : { ...STANDARD_FORMAT };
  // Standard format already sets font, size and spacing in its styles.
  const runFmt = baseBuffer ? format : { jc: STANDARD_FORMAT.jc };
  const paragraphs = classifyLines(text).map((item) => paragraphXml(item, runFmt)).join('');

  zip.file('word/document.xml', replaceBody(documentXml, paragraphs));
  if (baseBuffer) await scrubMetadata(zip);
  const keptHeaderFooter = baseBuffer ? await headerFooterText(zip) : '';

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer, keptHeaderFooter, format };
}

module.exports = { STANDARD_FORMAT, buildDocx, classifyLines, dominantFormatting, replaceBody };
