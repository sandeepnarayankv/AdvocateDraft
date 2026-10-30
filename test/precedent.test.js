'use strict';
// Carry-over check and reference rendering for previous documents.
const assert = require('assert');
const { findCarryOver, renderReferences, fitReferences, dateSet, numberSet } = require('../src/precedent');

// Previous matter: a cheque-bounce complaint for a different client.
const precedent = {
  name: 'Complaint_Suresh_v_Anil_2021.docx',
  role: 'precedent',
  text: `IN THE COURT OF THE XV ADDITIONAL CHIEF METROPOLITAN MAGISTRATE AT BENGALURU

C.C. No. 4521/2021

Mr. Suresh Hegde, aged 52 years, residing at No. 14, 3rd Cross, Jayanagar, Bengaluru ... Complainant

Versus

Mr. Anil Kamath, aged 47 years ... Accused

COMPLAINT UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

1. The Complainant and the Accused are known to each other. The Accused borrowed a sum of Rs. 3,50,000 from the Complainant on 14.06.2021.
2. Towards repayment, the Accused issued cheque No. 004417 dated 20th August 2021 drawn on Canara Bank.
3. The cheque was returned unpaid with the endorsement "Funds Insufficient". A legal notice was issued under Section 138 of the Negotiable Instruments Act.
4. This Hon'ble Court has jurisdiction under the Code of Criminal Procedure, 1973.

PRAYER
Wherefore the Complainant prays that this Hon'ble Court may be pleased to take cognizance and punish the Accused.`,
};

// This matter.
const facts =
  'Client Lakshmi Rao lent Rs. 1,20,000 to Prakash Shenoy on 03.02.2024. Shenoy issued cheque No. 118829 ' +
  'dated 15 March 2024 on State Bank of India. It bounced for insufficient funds. Court at Bengaluru.';
const source = { name: 'Return memo.pdf', text: 'Cheque 118829 returned: FUNDS INSUFFICIENT. Drawer: Prakash Shenoy.' };
const allowedText = [facts, source.text].join('\n');

// A draft that copied the structure correctly, but leaked four details.
const draft = `IN THE COURT OF THE XV ADDITIONAL CHIEF METROPOLITAN MAGISTRATE AT BENGALURU

Smt. Lakshmi Rao ... Complainant
Versus
Mr. Prakash Shenoy ... Accused

COMPLAINT UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

1. The Accused borrowed a sum of Rs. 1,20,000 from the Complainant on 03.02.2024, residing at Jayanagar.
2. The Accused issued cheque No. 118829 dated 15th March 2024 drawn on State Bank of India.
3. The cheque was returned unpaid. A legal notice was issued under Section 138 of the Negotiable Instruments Act.
4. A part payment of Rs. 3,50,000 was promised on 14/06/2021 by Mr. Anil Kamath.
5. This Hon'ble Court has jurisdiction under the Code of Criminal Procedure, 1973.

PRAYER
Wherefore the Complainant prays that this Hon'ble Court may be pleased to take cognizance and punish the Accused.`;

const items = findCarryOver({ draft, references: [precedent], allowedText });
const values = items.map((i) => `${i.kind}:${i.value}`);

// Leaks that must be caught.
assert(values.includes('name:Anil Kamath'), `old party name not flagged: ${values}`);
assert(values.includes('name:Jayanagar'), `old address not flagged: ${values}`);
assert(values.includes('number:3,50,000'), `old amount not flagged: ${values}`);
assert(values.includes('date:14/06/2021'), `old date (in another format) not flagged: ${values}`);

// Must NOT be flagged: this matter's own details, the court, statute names
// and numbers, boilerplate.
for (const bad of ['Lakshmi', 'Shenoy', 'Bengaluru', 'Negotiable', 'Instruments', 'Criminal', 'Metropolitan', 'Hon', 'Wherefore', 'Smt']) {
  assert(!values.some((v) => v.includes(bad)), `false positive: ${bad} in ${values}`);
}
for (const bad of ['138', '1881', '1973', '1,20,000', '118829']) {
  assert(!values.some((v) => v.endsWith(':' + bad)), `false positive number: ${bad}`);
}

// No previous document -> nothing flagged.
assert.deepStrictEqual(findCarryOver({ draft, references: [], allowedText }), []);
// Clean draft -> nothing flagged.
const clean = draft.replace(', residing at Jayanagar', '').replace(/4\. A part payment.*\n/, '');
assert.deepStrictEqual(findCarryOver({ draft: clean, references: [precedent], allowedText }), [], 'clean draft flagged');

// Date normalisation and number handling.
assert(dateSet('on 14.06.2021').has('14-6-2021'));
assert(dateSet('on 14th June 2021').has('14-6-2021'));
assert(dateSet('June 14, 2021').has('14-6-2021'));
assert(!numberSet('under Section 138 of', { skipStatutory: true }).has('138'));
assert(numberSet('Rs. 3,50,000/-').has('350000'));

// Prompt rendering: tagged separately; long previous documents trimmed, templates never.
const template = { name: 'NI Act template.docx', role: 'template', text: 'COMPLAINT UNDER SECTION 138\n1. [Facts]\nPRAYER' };
const { templatesText, precedentsText } = renderReferences([template, precedent]);
assert(templatesText.startsWith('<template name="NI Act template.docx">'));
assert(precedentsText.startsWith('<previous_document name="Complaint_Suresh_v_Anil_2021.docx">'));
const huge = { name: 'big.docx', role: 'precedent', text: 'line of text\n'.repeat(30000) };
const fitted = fitReferences([template, huge, { ...huge, name: 'big2.docx' }], 120000);
assert(fitted.every((r) => (r.role === 'template' ? !r.truncated : r.truncated)));
assert(fitted.reduce((s, r) => s + r.text.length, 0) <= 120000);

console.log('precedent: all passed; flagged in sample draft:', values.join(', '));
