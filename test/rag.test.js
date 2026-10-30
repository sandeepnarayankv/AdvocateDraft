'use strict';
// Chunking and BM25 retrieval.
const assert = require('assert');
const { selectContext, renderContext, chunkDocument, tokenize } = require('../src/rag');

// A short agreement plus a long, mostly irrelevant bank statement with one
// relevant entry buried in the middle.
const agreement = {
  name: 'Lease Agreement.pdf',
  text:
    'LEASE AGREEMENT dated 12 March 2023 between Ramesh Kumar (Lessor) and Priya Shetty (Lessee).\n\n' +
    'The monthly rent is Rs. 45,000 payable on or before the 5th of every month.\n\n' +
    'A security deposit of Rs. 2,70,000 was paid by the Lessee on 10 March 2023.\n\n' +
    'Either party may terminate with three months written notice.',
};
const filler = Array.from({ length: 400 }, (_, i) =>
  `Entry ${i + 1}: Grocery purchase at store number ${i % 37}, card payment, routine monthly household expense recorded.`
);
filler.splice(213, 0, 'Entry X: NEFT transfer of Rs. 2,70,000 security deposit to Ramesh Kumar on 10 March 2023.');
const statement = { name: 'Bank Statement.pdf', text: filler.join('\n\n') };
const facts = 'Lessee Priya Shetty vacated. Lessor Ramesh Kumar has not refunded the security deposit of Rs. 2,70,000.';

assert.deepStrictEqual(tokenize('The deposits of Rs. 2,70,000'), ['deposit', 'rs', '2', '70', '000']);

const ch = chunkDocument(statement, 1, { overlapChars: 0 });
assert(ch.every((c) => c.text.length <= 1700), 'chunk too large');
assert.strictEqual(ch.map((c) => c.text).join('\n\n').length, statement.text.length, 'full-mode chunks lose text');

let ctx = selectContext([agreement, statement], facts, { budgetChars: 1e6 });
assert.strictEqual(ctx.mode, 'full');
assert.strictEqual(ctx.stats.passagesUsed, ctx.stats.passagesTotal);

ctx = selectContext([agreement, statement], facts, { budgetChars: 6000 });
assert.strictEqual(ctx.mode, 'retrieved');
assert(ctx.stats.usedChars <= 6000, `over budget: ${ctx.stats.usedChars}`);
const rendered = renderContext(ctx);
assert(rendered.includes('NEFT transfer of Rs. 2,70,000'), 'buried relevant entry not retrieved');
assert(rendered.includes('LEASE AGREEMENT dated 12 March 2023'), 'agreement opening missing');
assert(rendered.includes('[… passages omitted …]'), 'gap marker missing');

ctx = selectContext([statement], '', { budgetChars: 3000 });
assert.strictEqual(ctx.blocks[0].passages[0].seq, 0);

ctx = selectContext([{ name: 'empty.pdf', text: '' }], facts, {});
assert.strictEqual(ctx.stats.documents, 0);

console.log('rag: all passed');
