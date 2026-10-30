'use strict';

// ---------------------------------------------------------------------------
// Local settings and secrets
// ---------------------------------------------------------------------------
// One config.json in the app's data folder. Secrets (API keys, ChatGPT
// tokens) are encrypted with the OS keychain through Electron's safeStorage;
// if that is unavailable they are stored plainly and the UI says so.
//
// Shape:
//   { active: { provider, model },
//     hostId: 'urn:uuid:…',
//     providers: { <id>: { secret: { enc | plain }, model, baseUrl, clientId } } }

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function createStore({ dir, safeStorage }) {
  const file = () => path.join(dir(), 'config.json');

  function read() {
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(file(), 'utf8'));
    } catch {
      cfg = {};
    }
    cfg.providers = cfg.providers || {};
    // Single-provider versions kept one Claude key at the top level.
    if (cfg.apiKeyEnc || cfg.apiKeyPlain) {
      cfg.providers.anthropic = cfg.providers.anthropic || {};
      cfg.providers.anthropic.secret = cfg.apiKeyEnc ? { enc: cfg.apiKeyEnc } : { plain: cfg.apiKeyPlain };
      delete cfg.apiKeyEnc;
      delete cfg.apiKeyPlain;
      write(cfg);
    }
    return cfg;
  }

  // Write via a temp file so a crash never leaves a half-written config.
  function write(cfg) {
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, file());
  }

  const provider = (cfg, id) => (cfg.providers[id] = cfg.providers[id] || {});

  return {
    encryptionAvailable: () => safeStorage.isEncryptionAvailable(),

    getSecret(id) {
      const s = (read().providers[id] || {}).secret;
      if (!s) return '';
      if (s.enc) {
        if (!safeStorage.isEncryptionAvailable()) return '';
        try {
          return safeStorage.decryptString(Buffer.from(s.enc, 'base64'));
        } catch {
          return '';
        }
      }
      return s.plain || '';
    },

    setSecret(id, value) {
      const cfg = read();
      const p = provider(cfg, id);
      if (!value) delete p.secret;
      else if (safeStorage.isEncryptionAvailable()) p.secret = { enc: safeStorage.encryptString(value).toString('base64') };
      else p.secret = { plain: value };
      write(cfg);
    },

    hasSecret: (id) => Boolean((read().providers[id] || {}).secret),

    getSetting: (id, key) => (read().providers[id] || {})[key],

    setSetting(id, key, value) {
      const cfg = read();
      const p = provider(cfg, id);
      if (value === undefined || value === null || value === '') delete p[key];
      else p[key] = value;
      write(cfg);
    },

    getActive: () => read().active || {},

    setActive(active) {
      const cfg = read();
      cfg.active = { provider: active.provider, model: active.model || '' };
      if (active.model) provider(cfg, active.provider).model = active.model;
      write(cfg);
    },

    // Stable, opaque id for this installation (Sign in with ChatGPT needs one).
    getHostId() {
      const cfg = read();
      if (!cfg.hostId) {
        cfg.hostId = `urn:uuid:${crypto.randomUUID()}`;
        write(cfg);
      }
      return cfg.hostId;
    },
  };
}

module.exports = { createStore };
