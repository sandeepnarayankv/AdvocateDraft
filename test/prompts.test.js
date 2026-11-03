'use strict';
// Prompt sections: overrides, persistence, import/export, assembly.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('../src/prompts');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-prompts-'));

// Defaults when nothing saved.
assert.deepStrictEqual(P.loadOverrides(dir), {});
assert.deepStrictEqual(P.effectivePrompts({}), P.DEFAULTS);

// Saving keeps only real changes: unchanged, blank and unknown keys are dropped.
const saved = P.saveOverrides(dir, {
  core: P.DEFAULTS.core,
  task: '  Draft it in formal Indian court English.  ',
  noNotes: '   ',
  bogus: 'x',
});
assert.deepStrictEqual(saved, { task: 'Draft it in formal Indian court English.' });
assert.deepStrictEqual(P.loadOverrides(dir), saved);

// Editor description flags customised sections.
const desc = P.describePrompts(saved);
assert.strictEqual(desc.length, P.SECTIONS.length);
assert(desc.find((s) => s.key === 'task').custom);
assert(!desc.find((s) => s.key === 'core').custom);

// Corrupt file -> defaults, no crash.
fs.writeFileSync(path.join(dir, 'prompts.json'), '{not json');
assert.deepStrictEqual(P.loadOverrides(dir), {});

// Export / import round trip; unknown sections reported, not applied.
const file = P.exportFile({ precedent: 'Custom precedent rule.' });
const back = P.parseImportFile(file);
assert.deepStrictEqual(back.overrides, { precedent: 'Custom precedent rule.' });
const withUnknown = P.parseImportFile(JSON.stringify({ prompts: { core: 'X core', future: 'y' } }));
assert.deepStrictEqual(withUnknown.unknown, ['future']);
assert.throws(() => P.parseImportFile('nope'), /valid prompts file/);
assert.throws(() => P.parseImportFile('{"a":1}'), /Not an Advocate Draft/);

// Assembly: sections appear only in their situation.
const prompts = P.effectivePrompts({ precedent: 'CUSTOM PRECEDENT RULE' });
const base = { includeNotes: false, mode: 'full', hasTemplate: false, hasPrecedent: false };
let sys = P.buildSystemPrompt(prompts, base);
assert(sys.startsWith(P.DEFAULTS.core));
assert(!sys.includes('CUSTOM PRECEDENT RULE') && !sys.includes(P.DEFAULTS.template) && !sys.includes(P.SOURCE_NOTES_MARKER));
assert(sys.endsWith(P.DEFAULTS.noNotes));

sys = P.buildSystemPrompt(prompts, { includeNotes: true, mode: 'retrieved', hasTemplate: true, hasPrecedent: true });
for (const part of [P.DEFAULTS.template, 'CUSTOM PRECEDENT RULE', P.DEFAULTS.templateAndPrecedent, P.DEFAULTS.partial, P.DEFAULTS.notes]) {
  assert(sys.includes(part), `missing: ${part.slice(0, 40)}`);
}
// The marker line is always present with notes on, even if notes text is customised.
sys = P.buildSystemPrompt(P.effectivePrompts({ notes: 'Just list sources.' }), { ...base, includeNotes: true });
assert(sys.includes(`"${P.SOURCE_NOTES_MARKER}"`) && sys.includes('Just list sources.'));

// Custom task line ends the message.
const user = P.buildUserPrompt(P.effectivePrompts({ task: 'MY TASK' }), { facts: 'f', contextText: 'c', today: new Date(2026, 10, 4) });
assert(user.endsWith('TASK: MY TASK'));
assert(user.includes('<case_facts>\n(this matter)\nf\n</case_facts>'));
// Long material first, the facts and task last.
assert(user.indexOf('<source_documents>') < user.indexOf('<format_instructions>'));
assert(user.indexOf('<format_instructions>') < user.indexOf('<case_facts>'));
assert(user.includes("Today's date: 4 November 2026"), 'today\'s date line');
// Previous documents and templates sit with the long material, before the instructions.
const withRefs = P.buildUserPrompt(P.DEFAULTS, { facts: 'f', contextText: 'c', templatesText: 'T', precedentsText: 'PD' });
assert(withRefs.indexOf('<previous_documents>') < withRefs.indexOf('<templates>'));
assert(withRefs.indexOf('<templates>') < withRefs.indexOf('<format_instructions>'));
assert(withRefs.includes('from ANOTHER matter'));
// The new rules are present.
for (const rule of ['disagree', 'instructions', 'Rupees Two Lakh Seventy Thousand only', 'no markdown', 'Cite a statutory provision only']) {
  assert(P.DEFAULTS.core.includes(rule), `core rule missing: ${rule}`);
}

console.log('prompts: all passed');
