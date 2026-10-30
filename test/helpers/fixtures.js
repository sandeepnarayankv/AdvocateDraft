'use strict';
// Builds sample documents for the OCR tests: a text PDF, a scanned PDF (page
// is only an image of text), a mixed PDF, and a PNG "photo" of a document.
const { createCanvas } = require('@napi-rs/canvas');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const SCANNED_LINES = [
  'LEGAL NOTICE',
  'Under instructions from my client Priya Shetty,',
  'I call upon you Ramesh Kumar to refund the',
  'security deposit of Rs. 2,70,000 within 15 days.',
];

// A page image like a scanner produces: black text on white, slight grey.
function scannedImage(lines = SCANNED_LINES) {
  const canvas = createCanvas(1700, 2200); // ~200 DPI A4-ish
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111111';
  ctx.font = '44px serif';
  lines.forEach((l, i) => ctx.fillText(l, 140, 220 + i * 90));
  return canvas.toBuffer('image/png');
}

async function textPdf(lines) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.addPage([595, 842]);
  lines.forEach((l, i) => page.drawText(l, { x: 60, y: 760 - i * 22, size: 13, font }));
  return Buffer.from(await pdf.save());
}

async function scannedPdf(pages = 1) {
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(scannedImage());
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage([595, 842]);
    page.drawImage(png, { x: 0, y: 0, width: 595, height: 842 * (2200 / 1700) * (595 / 842) });
  }
  return Buffer.from(await pdf.save());
}

// Page 1 has a text layer, page 2 is a scan.
async function mixedPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const p1 = pdf.addPage([595, 842]);
  p1.drawText('LEASE AGREEMENT dated 12 March 2023 between Ramesh Kumar and Priya Shetty.', { x: 40, y: 780, size: 11, font });
  const png = await pdf.embedPng(scannedImage());
  const p2 = pdf.addPage([595, 842]);
  p2.drawImage(png, { x: 0, y: 72, width: 595, height: 770 });
  return Buffer.from(await pdf.save());
}

module.exports = { scannedImage, textPdf, scannedPdf, mixedPdf, SCANNED_LINES };
