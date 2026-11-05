'use strict';
// Script checks on AI transcriptions, using the outputs seen in a live test of
// a free vision model on a receipt with an English + Kannada page.
const assert = require('assert');
const { scriptsIn, unexpectedScripts, compareWithOcr } = require('../src/scripts');

// What the built-in OCR read (correct Kannada; note the zero-width joiners it emits).
const OCR = [
  'RECEIPT',
  'Received with thanks from 5/01. Priya Shetty',
  'a sum of Rs. 2,70,000/- (Rupees Two Lakh',
  'ಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ - ರಮೇಶ್‌ ಕುಮಾರ್‌',
].join('\n');
// Live outputs of the vision model:
const AI_MALAYALAM = 'Received with thanks from Smt. Priya Shetty\nധന്യ നന്ദി സഹചാരികള്‍ - രമേഷ് കുമാര്‍';
const AI_WRONG_WORDS = 'Received with thanks from Smt. Priya Shetty\nಹೊಸ ಸಹಿಯಾಗಿದೆ - ರಮೇಶ್ ಕುಮಾರ್';
const AI_CORRECT = 'Received with thanks from Smt. Priya Shetty\nಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ - ರಮೇಶ್ ಕುಮಾರ್';

// Script detection.
assert.deepStrictEqual(scriptsIn(AI_MALAYALAM), ['Malayalam']);
assert.deepStrictEqual(scriptsIn('Rs. 2,70,000 only'), []);
assert.deepStrictEqual(scriptsIn('मेरे मुवक्किल ಕನ್ನಡ'), ['Devanagari', 'Kannada']);

// A script nobody selected is flagged; shared scripts (Hindi/Marathi) are not.
assert.deepStrictEqual(unexpectedScripts(AI_MALAYALAM, ['eng', 'kan']), ['Malayalam']);
assert.deepStrictEqual(unexpectedScripts(AI_CORRECT, ['eng', 'kan']), []);
assert.deepStrictEqual(unexpectedScripts('मेरे मुवक्किल', ['eng', 'mar']), []);
assert.deepStrictEqual(unexpectedScripts('اردو متن', ['eng', 'urd']), []);
assert.deepStrictEqual(unexpectedScripts('اردو متن', ['eng', 'hin']), ['Arabic']);

// Cross-check with OCR: wrong words in the right script are caught too.
let m = compareWithOcr(AI_WRONG_WORDS, OCR);
assert.strictEqual(m.length, 1);
assert.strictEqual(m[0].script, 'Kannada');
assert.strictEqual(m[0].agreement, 50);
assert(m[0].ocr.includes('ಹಣ ಸ್ವೀಕರಿಸಲಾಗಿದೆ') && m[0].ai.includes('ಹೊಸ ಸಹಿಯಾಗಿದೆ'), 'both versions shown');
m = compareWithOcr(AI_MALAYALAM, OCR);
assert.strictEqual(m[0].agreement, 0);
assert.strictEqual(m[0].ai, '(none)');
// A correct reading agrees, despite the joiners in the OCR text.
assert.deepStrictEqual(compareWithOcr(AI_CORRECT, OCR), []);
// English-only differences are not this check's business (OCR is weak on handwriting).
assert.deepStrictEqual(compareWithOcr('Received from Smt. Priya Shetty', 'Received from 5/01. Priya Shetty'), []);

console.log('scripts: all passed');
