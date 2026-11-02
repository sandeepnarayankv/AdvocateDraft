'use strict';
// Checks that document reading works from the PACKAGED app files, using the
// packaged executable as the runtime (as the installed app does).
// Usage (after npm run dist):
//   set ELECTRON_RUN_AS_NODE=1
//   "dist\win-unpacked\Advocate Draft.exe" build\verify-package.js <scanned.pdf> <text.pdf>
const path = require('path');

const appDir = path.join(path.dirname(process.execPath), 'resources', 'app');
const { createOcrService, nodeSpawner } = require(path.join(appDir, 'src', 'ocr', 'service.js'));
const [scanned, textPdf] = process.argv.slice(2);

(async () => {
  console.log('runtime:', process.execPath, 'node', process.versions.node, 'electron', process.versions.electron);
  const ocr = createOcrService({ spawn: nodeSpawner() });
  const t0 = Date.now();
  const scan = await ocr.read(scanned, 'pdf', { langs: ['eng', 'hin'] }).promise;
  console.log(`scanned PDF: ${scan.pages} pages, ${scan.ocrPages} OCR, confidence ${scan.confidence}%, ${Date.now() - t0} ms`);
  console.log('  text:', scan.text.replace(/\s+/g, ' ').slice(0, 90));
  const text = await ocr.read(textPdf, 'pdf', { langs: ['eng'] }).promise;
  console.log(`text PDF: ${text.pages} page(s), ${text.ocrPages} OCR —`, text.text.replace(/\s+/g, ' ').slice(0, 60));
  const imgs = await ocr.read(scanned, 'pdf', { op: 'images' }).promise;
  console.log(`page images for AI: ${imgs.filter((p) => p.image).length} of ${imgs.length} pages`);
  ocr.stop();
  const ok = scan.ocrPages === scan.pages && /2,70,000/.test(scan.text) && text.ocrPages === 0 && imgs.every((p) => p.image);
  console.log(ok ? 'PACKAGE CHECK PASSED' : 'PACKAGE CHECK FAILED');
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('PACKAGE CHECK FAILED:', e);
  process.exit(1);
});
