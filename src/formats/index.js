'use strict';

// Built-in Indian legal formats. Each format:
//   id, title, category, forum, law, use,
//   facts:       checklist of facts the draft needs (pre-fills the facts box),
//   annexures:   documents usually filed with it,
//   instructions: drafting notes for the model (added to the format instructions),
//   template:    skeleton with [PLACEHOLDERS], used as a <template>.

const all = [
  ...require('./civil'),
  ...require('./criminal'),
  ...require('./family-consumer'),
  ...require('./notices-deeds'),
  ...require('./writs-rti'),
  ...require('./motor-accident'),
  ...require('./arbitration'),
  ...require('./rent'),
];

const CATEGORIES = [
  'Civil',
  'Criminal',
  'Family & consumer',
  'Notices, deeds & affidavits',
  'Writs',
  'Motor accident claims',
  'Arbitration',
  'Rent & eviction',
  'RTI',
];

const byId = new Map(all.map((f) => [f.id, f]));

// Summaries for the picker (no template text, to keep IPC small).
const list = () =>
  all.map(({ id, title, category, forum, law, use, facts, annexures }) => ({ id, title, category, forum, law, use, facts, annexures }));

module.exports = { all, CATEGORIES, list, get: (id) => byId.get(id) };
