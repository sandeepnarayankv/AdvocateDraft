'use strict';
// Word export: standard format and formatting taken from an existing .docx.
const assert = require('assert');
const JSZip = require('jszip');
const mammoth = require('mammoth');
const { buildDocx, classifyLines } = require('../src/docx-export');

const draft = `IN THE COURT OF THE CITY CIVIL JUDGE AT BENGALURU
O.S. No. [TO CONFIRM: number] of 2026

Smt. Lakshmi Rao ... Plaintiff
Versus
Mr. Prakash Shenoy ... Defendant

PLAINT UNDER ORDER VII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908

1. The Plaintiff lent Rs. 1,20,000 to the Defendant on 03.02.2024.
2. The Defendant issued cheque No. 118829, which was dishonoured on [TO CONFIRM: date of return].
The plaint is **valued** at Rs. 1,20,000.

PRAYER`;

// A previous document with its own letterhead, font, spacing, margins, old
// facts in the body and an old title in its properties.
async function previousDocument() {
  const { Document, Packer, Paragraph, TextRun, Header, AlignmentType } = require('docx');
  const doc = new Document({
    title: 'Suresh Hegde v Anil Kamath - plaint',
    creator: 'Old Clerk',
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 20160 }, margin: { top: 1000, bottom: 1000, left: 1800, right: 1000 } } },
        headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun('LAW OFFICES OF K. SHARMA, ADVOCATES')] })] }) },
        children: [1, 2, 3].map(
          (i) =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: 480 },
              children: [new TextRun({ text: `Para ${i}: Suresh Hegde lent Rs. 3,50,000 to Anil Kamath.`, font: 'Garamond', size: 26 })],
            })
        ),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

const docXml = async (buf) => (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');

(async () => {
  // Line classification.
  const kinds = classifyLines(draft).map((l) => l.kind);
  assert.deepStrictEqual(kinds.slice(0, 7), ['heading', 'body', 'blank', 'body', 'centre', 'body', 'blank']);
  assert.strictEqual(classifyLines('1. The Plaintiff lent')[0].kind, 'numbered');
  assert.strictEqual(classifyLines('(a) first ground')[0].number, '(a)');
  assert.strictEqual(classifyLines('I am the deponent')[0].kind, 'body');

  // 1. Standard format.
  let out = await buildDocx(draft, null);
  let xml = await docXml(out.buffer);
  const zip = await JSZip.loadAsync(out.buffer);
  const styles = await zip.file('word/styles.xml').async('string');
  assert(styles.includes('Times New Roman'), 'standard font missing');
  assert(/<w:pgSz w:w="11906" w:h="16838"/.test(xml), 'not A4');
  assert(/<w:pgMar[^>]*w:left="2160"/.test(xml), 'binding margin missing');
  const footers = Object.keys(zip.files).filter((n) => /word\/footer\d*\.xml/.test(n));
  assert(footers.length, 'no footer');
  assert((await zip.file(footers[0]).async('string')).includes('PAGE'), 'no page number');
  assert(/<w:jc w:val="center"\/><\/w:pPr><w:r><w:rPr><w:b\/>/.test(xml), 'heading not centred bold');
  assert(xml.includes('<w:ind w:left="720" w:hanging="720"/>'), 'numbered paragraph not indented');
  assert(/<w:highlight w:val="yellow"\/><\/w:rPr><w:t xml:space="preserve">\[TO CONFIRM: number\]/.test(xml), 'TO CONFIRM not highlighted');
  assert(xml.includes('<w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">valued</w:t>'), '**bold** not converted');
  assert(!xml.includes('**'), 'markdown asterisks left in');
  assert.strictEqual(out.keptHeaderFooter, '');

  // Valid enough for a Word reader: text round-trips.
  let text = (await mammoth.extractRawText({ buffer: out.buffer })).value;
  assert(text.includes('Smt. Lakshmi Rao ... Plaintiff'));
  assert(text.includes('1.\tThe Plaintiff lent Rs. 1,20,000'));

  // 2. Formatting from a previous document.
  const base = await previousDocument();
  out = await buildDocx(draft, base);
  xml = await docXml(out.buffer);
  assert(!xml.includes('Suresh') && !xml.includes('3,50,000'), 'old body content kept');
  assert(xml.includes('Lakshmi Rao'), 'new content missing');
  assert(/<w:pgSz w:w="12240" w:h="20160"/.test(xml), 'page size not kept');
  assert(/<w:pgMar[^>]*w:left="1800"/.test(xml), 'margins not kept');
  assert(xml.includes('<w:headerReference'), 'header reference dropped');
  assert(xml.includes('w:ascii="Garamond"') && xml.includes('<w:sz w:val="26"/>'), 'body font/size not carried');
  assert(xml.includes('w:line="480"'), 'line spacing not carried');
  assert(/<w:jc w:val="both"\/><\/w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond"/.test(xml), 'justification not carried');
  assert.strictEqual(out.keptHeaderFooter, 'LAW OFFICES OF K. SHARMA, ADVOCATES');

  const core = await (await JSZip.loadAsync(out.buffer)).file('docProps/core.xml').async('string');
  assert(!core.includes('Suresh') && !core.includes('Old Clerk'), 'old title/author kept in properties');

  text = (await mammoth.extractRawText({ buffer: out.buffer })).value;
  assert(text.includes('PRAYER') && !text.includes('Anil'));

  // 3. Not a Word file.
  await assert.rejects(buildDocx(draft, Buffer.from('not a zip')));

  console.log('docx-export: all passed');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
