'use strict';
// OCR pipeline: text-layer PDFs, scanned PDFs, mixed PDFs, images, cancel.
const assert = require('assert');
const { createReader, summarise, cleanOcrText } = require('../src/ocr/pipeline');
const fx = require('./helpers/fixtures');

const norm = (s) => s.replace(/\s+/g, ' ').toLowerCase();

(async () => {
  // OCR clean-up: amounts with dots become commas; real decimals and dates are left alone.
  assert.strictEqual(cleanOcrText('Rs. 2.70.000 and 1.20.00.000'), 'Rs. 2,70,000 and 1,20,00,000');
  assert.strictEqual(cleanOcrText('rate 12.50 per cent on 03.02.2024'), 'rate 12.50 per cent on 03.02.2024');
  assert.strictEqual(cleanOcrText('| call upon you\nthe | symbol'), 'I call upon you\nthe | symbol');

  const reader = createReader({ langs: ['eng'] });
  try {
    // 1. A normal PDF: text layer used, no OCR.
    let pages = await reader.readPdf(await fx.textPdf(['IN THE COURT OF THE CIVIL JUDGE AT BENGALURU', 'O.S. No. 123 of 2026']));
    let s = summarise(pages);
    assert.strictEqual(s.ocrPages, 0, 'text PDF should not be OCR-ed');
    assert(norm(s.text).includes('in the court of the civil judge at bengaluru'), s.text);
    console.log('ok  text PDF read from its text layer');

    // 2. A scanned PDF: OCR recovers the text.
    const progress = [];
    pages = await reader.readPdf(await fx.scannedPdf(2), { onProgress: (p) => progress.push(p) });
    s = summarise(pages);
    assert.strictEqual(s.pages, 2);
    assert.strictEqual(s.ocrPages, 2, 'scanned pages should be OCR-ed');
    const t = norm(s.text);
    for (const w of ['legal notice', 'priya shetty', 'ramesh kumar', 'security deposit', '2,70,000']) {
      assert(t.includes(w), `OCR missed "${w}": ${s.text}`);
    }
    assert(s.confidence >= 70, `low confidence ${s.confidence}`);
    assert.deepStrictEqual(progress.map((p) => `${p.page}/${p.total}`), ['1/2', '2/2']);
    console.log(`ok  scanned PDF OCR-ed (confidence ${s.confidence}%)`);

    // 3. Mixed PDF: page 1 from text layer, page 2 by OCR.
    pages = await reader.readPdf(await fx.mixedPdf());
    assert.deepStrictEqual(pages.map((p) => p.ocr), [false, true]);
    assert(norm(pages[0].text).includes('lease agreement dated 12 march 2023'));
    assert(norm(pages[1].text).includes('security deposit'));
    console.log('ok  mixed PDF: OCR only where needed');

    // 4. Photo / image of a document.
    pages = await reader.readImage(fx.scannedImage());
    assert(norm(pages[0].text).includes('legal notice') && pages[0].ocr);
    console.log('ok  image OCR-ed');

    // 5. Cancel stops between pages.
    const controller = new AbortController();
    const p = reader.readPdf(await fx.scannedPdf(4), {
      signal: controller.signal,
      onProgress: ({ page }) => page === 1 && controller.abort(),
    });
    await assert.rejects(p, (e) => e.cancelled === true);
    console.log('ok  cancel');

    // 6. Not a PDF.
    await assert.rejects(reader.readPdf(Buffer.from('not a pdf')));

    // 7. Page images for Read with AI: text pages keep text and send no
    //    image; scanned pages and photos become JPEGs within the size cap.
    const { loadImage } = require('@napi-rs/canvas');
    const imgs = await reader.pageImages(await fx.mixedPdf(), 'pdf');
    assert.strictEqual(imgs.length, 2);
    assert(imgs[0].image === null && /LEASE AGREEMENT/.test(imgs[0].text), 'text page should not be sent as an image');
    assert(imgs[1].image && imgs[1].image.mediaType === 'image/jpeg');
    const jpeg = Buffer.from(imgs[1].image.data, 'base64');
    assert(jpeg[0] === 0xff && jpeg[1] === 0xd8, 'not a JPEG');
    const decoded = await loadImage(jpeg);
    assert.strictEqual(Math.max(decoded.width, decoded.height), 2000, 'page image not scaled to 2000px');
    const photo = await reader.pageImages(fx.scannedImage(), 'image');
    const photoImg = await loadImage(Buffer.from(photo[0].image.data, 'base64'));
    assert(Math.max(photoImg.width, photoImg.height) <= 2000);
    console.log(`ok  page images for AI (${Math.round(jpeg.length / 1024)} KB per scanned page)`);
  } finally {
    await reader.close();
  }

  // 7. Indian language packs load (Hindi + English together).
  const multi = createReader({ langs: ['eng', 'hin', 'xx'] });
  assert.deepStrictEqual(multi.languages, ['eng', 'hin'], 'unknown languages must be dropped');
  const res = await multi.readImage(fx.scannedImage());
  assert(norm(res[0].text).includes('legal notice'));
  await multi.close();
  console.log('ok  English + Hindi language packs');

  console.log('ocr: all passed');
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
