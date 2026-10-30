'use strict';

// ---------------------------------------------------------------------------
// Sign in with ChatGPT (OpenAI "token sharing" preview)
// ---------------------------------------------------------------------------
// Browser-based OAuth (authorization code + PKCE) with a loopback callback on
// 127.0.0.1. The first sign-in registers this app via dynamic_agent_client and
// receives an issued client_id, which is kept (with a stable host id) for all
// later sign-ins. Tokens are stored encrypted by the credential store.

const crypto = require('crypto');
const http = require('http');
const { ProviderError, isNetworkError } = require('./providers/http');

const AUTH_URL = () => process.env.ADVOCATE_DRAFT_OPENAI_AUTH_URL || 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const PLAN_SCOPE = 'chatgpt.tokens.use.direct';
const CALLBACK_PATH = '/auth/callback';
const PORTS = [1455, 1456, 1457, 1458, 1459, 1460];
const REFRESH_TERMINAL = new Set([
  'invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired',
  'refresh_token_invalidated', 'refresh_token_reused',
]);

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = (n = 32) => b64url(crypto.randomBytes(n));
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

async function discovery() {
  const res = await fetch(`${AUTH_URL()}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`OpenID configuration unavailable (HTTP ${res.status})`);
  return res.json();
}

// Verify an ID token's signature against OpenAI's published keys, then its
// issuer, audience, expiry and nonce.
async function verifyIdToken(idToken, { issuer, jwksUri, audience, nonce }) {
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('Malformed ID token');
  const header = JSON.parse(fromB64url(parts[0]).toString('utf8'));
  const claims = JSON.parse(fromB64url(parts[1]).toString('utf8'));

  const res = await fetch(jwksUri);
  if (!res.ok) throw new Error('Could not load OpenAI signing keys');
  const { keys = [] } = await res.json();
  const jwk = keys.find((k) => k.kid === header.kid) || (keys.length === 1 ? keys[0] : null);
  if (!jwk) throw new Error('ID token signed with an unknown key');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = fromB64url(parts[2]);
  const algs = {
    RS256: () => crypto.verify('RSA-SHA256', signed, key, sig),
    ES256: () => crypto.verify('SHA256', signed, { key, dsaEncoding: 'ieee-p1363' }, sig),
  };
  if (!algs[header.alg] || !algs[header.alg]()) throw new Error('ID token signature is not valid');

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== issuer) throw new Error('ID token issuer mismatch');
  if (!aud.includes(audience)) throw new Error('ID token audience mismatch');
  if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new Error('ID token expired');
  if (nonce !== undefined && claims.nonce !== nonce) throw new Error('ID token nonce mismatch');
  return claims;
}

async function tokenRequest(form) {
  const res = await fetch(`${AUTH_URL()}/api/accounts/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json.error;
    throw err;
  }
  return json;
}

// Listen on the first free loopback port in PORTS.
async function openLoopback() {
  for (const port of PORTS) {
    const server = http.createServer();
    const ok = await new Promise((resolve, reject) => {
      server.once('error', (err) => (err.code === 'EADDRINUSE' ? resolve(false) : reject(err)));
      server.listen(port, '127.0.0.1', () => resolve(true));
    });
    if (ok) return { server, port };
  }
  throw new ProviderError('Could not open a local port for sign-in (1455–1460 are in use).');
}

// Resolves with the callback's query parameters once the browser returns.
function waitForCallback(server, { state, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      setTimeout(() => server.close(), 50);
      fn(val);
    };
    const timer = setTimeout(() => finish(reject, new ProviderError('Sign-in timed out. Try again.')), timeoutMs);

    server.on('request', (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404).end();
        return;
      }
      const q = Object.fromEntries(url.searchParams);
      const ok = !q.error && q.state === state && q.code;
      res.writeHead(ok ? 200 : 400, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        `<!doctype html><meta charset="utf-8"><title>Advocate Draft</title>` +
          `<body style="font-family:system-ui;padding:40px;text-align:center">` +
          (ok
            ? '<h2>Signed in to Advocate Draft</h2><p>You can close this tab and return to the app.</p>'
            : '<h2>Sign-in did not complete</h2><p>Return to Advocate Draft and try again.</p>') +
          '</body>'
      );
      if (q.error) finish(reject, new ProviderError(`ChatGPT sign-in was not completed: ${q.error_description || q.error}.`));
      else if (q.state !== state) finish(reject, new ProviderError('Sign-in response did not match this request. Try again.'));
      else if (!q.code) finish(reject, new ProviderError('Sign-in returned no authorisation code. Try again.'));
      else finish(resolve, q);
    });
  });
}

// store: { getSecret, setSecret, getSetting, setSetting, getHostId } (credentials.js)
// openExternal: opens a URL in the system browser.
function createChatGptAuth({ store, openExternal, appName = 'Advocate Draft' }) {
  const ID = 'chatgpt';
  let refreshing = null;

  const record = () => {
    try {
      return JSON.parse(store.getSecret(ID) || 'null');
    } catch {
      return null;
    }
  };
  const save = (rec) => store.setSecret(ID, rec ? JSON.stringify(rec) : null);

  function status() {
    const r = record();
    return {
      signedIn: Boolean(r && r.refresh_token),
      email: r ? r.email : null,
      planUsage: Boolean(r && (r.scopes || []).includes(PLAN_SCOPE)),
    };
  }

  async function signIn({ timeoutMs = 5 * 60 * 1000 } = {}) {
    const savedClientId = store.getSetting(ID, 'clientId');
    const hostId = store.getHostId();
    const state = random();
    const nonce = random();
    const verifier = random(48);
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

    // The listener must be up before the browser opens.
    const { server, port } = await openLoopback();
    const callback = waitForCallback(server, { state, timeoutMs });
    const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`;

    const prev = record();
    const params = new URLSearchParams({
      client_id: savedClientId || 'dynamic_agent_client',
      ext_agent_host_id: hostId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES,
      resource: RESOURCE,
      state,
      nonce,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    if (!savedClientId) params.set('agent_name_hint', appName);
    if (prev && prev.id_token) params.set('id_token_hint', prev.id_token);
    if (prev && prev.email) params.set('login_hint', prev.email);
    try {
      await openExternal(`${AUTH_URL()}/api/accounts/authorize?${params}`);
    } catch (err) {
      server.close();
      callback.catch(() => {});
      throw new ProviderError(`Could not open the browser for sign-in: ${err.message}`);
    }

    const q = await callback;
    if (savedClientId && q.client_id && q.client_id !== savedClientId) {
      throw new ProviderError('Sign-in returned a different app registration. Try again.');
    }
    const clientId = savedClientId || q.client_id;
    if (!clientId) throw new ProviderError('Sign-in did not return an app registration. Try again.');

    let tokens;
    try {
      tokens = await tokenRequest({
        grant_type: 'authorization_code',
        code: q.code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: clientId,
        resource: RESOURCE,
      });
    } catch (err) {
      throw new ProviderError(`ChatGPT sign-in failed: ${err.message}. Try again.`);
    }

    const disc = await discovery();
    const claims = await verifyIdToken(tokens.id_token, {
      issuer: disc.issuer,
      jwksUri: disc.jwks_uri,
      audience: clientId,
      nonce,
    });
    // Signing in as a different account simply replaces the saved record.
    store.setSetting(ID, 'clientId', clientId);
    const scopes = String(tokens.scope || q.scope || '').split(/[\s+]+/).filter(Boolean);
    save({
      email: claims.email || null,
      issuer: disc.issuer,
      subject: claims.sub,
      client_id: clientId,
      ext_agent_host_id: hostId,
      id_token: tokens.id_token,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      scopes,
      saved_at: new Date().toISOString(),
    });
    return status();
  }

  async function refresh(rec) {
    let tokens;
    try {
      tokens = await tokenRequest({
        grant_type: 'refresh_token',
        client_id: rec.client_id,
        refresh_token: rec.refresh_token,
        resource: RESOURCE,
      });
    } catch (err) {
      if (REFRESH_TERMINAL.has(err.code) || err.status === 400 || err.status === 401) {
        save({ ...rec, access_token: null, refresh_token: null });
        throw new ProviderError('Your ChatGPT sign-in has expired. Sign in again under ⚙ AI providers.', { code: err.code });
      }
      if (isNetworkError(err)) throw new ProviderError('Could not reach OpenAI to renew the sign-in. Check your internet connection.', { retryable: true });
      throw new ProviderError(`Could not renew the ChatGPT sign-in (${err.message}). Try again shortly.`, { retryable: true });
    }
    // Access token, expiry, scopes and the rotating refresh token change together.
    const next = {
      ...rec,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || rec.refresh_token,
      id_token: tokens.id_token || rec.id_token,
      expires_at: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      scopes: tokens.scope ? String(tokens.scope).split(/\s+/) : rec.scopes,
      saved_at: new Date().toISOString(),
    };
    save(next);
    return next;
  }

  // A valid access token, refreshing it if it expires within two minutes.
  // Refreshes are serialised so a rotating refresh token is never reused.
  async function getAccessToken() {
    let rec = record();
    if (!rec || !rec.refresh_token) throw new ProviderError('Sign in with ChatGPT first, under ⚙ AI providers.');
    if (!(rec.scopes || []).includes(PLAN_SCOPE)) {
      throw new ProviderError('ChatGPT plan usage wasn’t allowed at sign-in. Sign in again and allow it, or use another provider.');
    }
    if (!rec.access_token || rec.expires_at - Date.now() < 120000) {
      refreshing = refreshing || refresh(rec).finally(() => (refreshing = null));
      rec = await refreshing;
    }
    return rec.access_token;
  }

  // Revoke the refresh token, then clear tokens. The issued client_id and
  // host id are kept for the next sign-in.
  async function signOut() {
    const rec = record();
    let revoked = true;
    if (rec && rec.refresh_token) {
      try {
        const disc = await discovery();
        const res = await fetch(disc.revocation_endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: rec.refresh_token,
            token_type_hint: 'refresh_token',
            client_id: rec.client_id,
          }).toString(),
        });
        revoked = res.ok;
      } catch {
        revoked = false;
      }
    }
    save(null);
    return { revoked };
  }

  return { status, signIn, signOut, getAccessToken };
}

module.exports = { createChatGptAuth, verifyIdToken, SCOPES, RESOURCE };
