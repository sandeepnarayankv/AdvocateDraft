'use strict';

// The AI services a draft can be generated with, in display order. Each
// module exposes: id, label, auth ('key' | 'oauth' | 'local'), keyUrl,
// privacy, defaultModel, fallbackModels, listModels(), stream().

const list = [
  require('./anthropic'),
  require('./gemini'),
  require('./openrouter'),
  require('./chatgpt'),
  require('./ollama'),
];

const byId = Object.fromEntries(list.map((p) => [p.id, p]));

module.exports = { list, get: (id) => byId[id] };
