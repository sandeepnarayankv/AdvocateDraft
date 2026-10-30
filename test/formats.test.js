'use strict';
// Built-in Indian formats: completeness, statutory references, export and prompt use.
const assert = require('assert');
const formats = require('../src/formats');
const { buildDocx } = require('../src/docx-export');
const { renderReferences } = require('../src/precedent');
const P = require('../src/prompts');

(async () => {
  const all = formats.all;
  assert(all.length >= 35, `expected at least 35 formats, got ${all.length}`);

  // Every format is complete.
  const ids = new Set();
  for (const f of all) {
    assert(!ids.has(f.id), `duplicate id ${f.id}`);
    ids.add(f.id);
    assert(formats.CATEGORIES.includes(f.category), `${f.id}: unknown category ${f.category}`);
    for (const k of ['title', 'forum', 'law', 'use', 'instructions', 'template']) {
      assert(typeof f[k] === 'string' && f[k].trim().length > 5, `${f.id}: missing ${k}`);
    }
    assert(Array.isArray(f.facts) && f.facts.length >= 3, `${f.id}: facts checklist too short`);
    assert(Array.isArray(f.annexures), `${f.id}: annexures missing`);
    assert(/\[[A-Z]/.test(f.template), `${f.id}: template has no placeholders`);
    assert(!f.template.includes('${') && !f.template.includes('undefined'), `${f.id}: unfilled template code`);
    assert(f.template.length > 400, `${f.id}: template suspiciously short`);
  }
  // Every category has formats.
  for (const c of formats.CATEGORIES) assert(all.some((f) => f.category === c), `no formats in ${c}`);

  // Key statutory references (verified against BNSS correspondence tables).
  const law = (id) => formats.get(id).law + ' ' + formats.get(id).template;
  const expectations = {
    'crim-bail-magistrate': /Section 480 BNSS/,
    'crim-bail-sessions-hc': /Section 483 BNSS/,
    'crim-anticipatory-bail': /Section 482 BNSS/,
    'crim-quashing-528': /Section 528 BNSS/,
    'crim-175-3-application': /Section 175\(3\) BNSS/,
    'crim-private-complaint': /Section 223 BNSS/,
    'crim-cheque-bounce-complaint': /Sections 138, 141 & 142 Negotiable Instruments Act/,
    'fam-maintenance-144': /Section 144 BNSS/,
    'fam-divorce-hma-13': /Section 13\(1\) Hindu Marriage Act/,
    'fam-mutual-divorce-13b': /Section 13B Hindu Marriage Act/,
    'fam-dv-act-12': /Section 12, Protection of Women from Domestic Violence Act/,
    'consumer-complaint': /Consumer Protection Act, 2019/,
    'civil-plaint-money': /Order VII Rule 1/,
    'civil-written-statement': /Order VIII/,
    'civil-temporary-injunction': /Order XXXIX Rules 1 & 2/,
    'civil-summary-suit': /Order XXXVII/,
    'civil-execution': /Order XXI Rule 11\(2\)/,
    'civil-caveat': /Section 148A CPC/,
    'notice-section-80': /Section 80 CPC/,
    'notice-cheque-138': /Section 138\(b\)/,
  };
  for (const [id, re] of Object.entries(expectations)) {
    assert(formats.get(id), `missing format ${id}`);
    assert(re.test(law(id)), `${id}: expected ${re}`);
  }
  // Repealed CrPC sections appear only as "earlier …" cross-references, never as the provision invoked.
  for (const f of all.filter((x) => x.category === 'Criminal' || x.id === 'fam-maintenance-144')) {
    assert(!/UNDER SECTION \d+ OF THE CODE OF CRIMINAL PROCEDURE/.test(f.template), `${f.id}: invokes the CrPC`);
  }
  // Statutory time rules the drafting notes must carry.
  assert(/within 30 days/.test(formats.get('notice-cheque-138').instructions));
  assert(/15 days/.test(formats.get('notice-cheque-138').instructions));
  assert(/two months/.test(formats.get('notice-section-80').instructions));
  assert(/Order XXXVII Rule 2\(1\)/.test(formats.get('civil-summary-suit').instructions));
  assert(/Rs\. 50 lakh/.test(formats.get('consumer-complaint').instructions));

  // The picker list carries no template text (kept small), but everything else.
  const summary = formats.list()[0];
  assert(!('template' in summary) && summary.facts.length);

  // Each format exports to Word and renders as a <template> for the prompt.
  for (const f of all) {
    const { buffer } = await buildDocx(f.template, null);
    assert(buffer.length > 3000, `${f.id}: export failed`);
    const { templatesText } = renderReferences([{ name: `Format: ${f.title}`, text: f.template, role: 'template' }]);
    assert(templatesText.startsWith('<template name="Format: '), `${f.id}: not rendered as template`);
  }
  const sys = P.buildSystemPrompt(P.effectivePrompts({}), { includeNotes: false, mode: 'full', hasTemplate: true, hasPrecedent: false });
  assert(sys.includes('<template> is a blank format'));

  console.log(`formats: all passed (${all.length} formats: ${formats.CATEGORIES.map((c) => `${c} ${all.filter((f) => f.category === c).length}`).join(', ')})`);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
