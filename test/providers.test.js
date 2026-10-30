'use strict';
// Gemini, OpenRouter, Ollama and Sign in with ChatGPT against local mock
// servers, through the real main-process IPC handlers.
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const { loadMain, fakeSender } = require('./helpers/harness');

// ---- one mock server for every remote service ------------------------------
const seen = {}; // last request body per route
const ctl = { geminiFinish: 'STOP', orFinish: 'stop', chatgptFail: null, refreshFail: null, expiresIn: 3600 };

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sign = (claims) => {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const body = b64url(JSON.stringify(claims));
  return `${head}.${body}.${b64url(crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey))}`;
};

const oauth = { authorizeParams: null, issuedClientId: 'oaiapp_test123', codes: new Map(), refresh: null, access: null, revoked: [], grants: [] };
let base;

const sse = (res, events) => {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  for (const e of events) res.write(e);
  res.end();
};
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url, base);
    const p = url.pathname;
    const body = raw && req.headers['content-type'] && req.headers['content-type'].includes('json') ? JSON.parse(raw) : raw;
    seen[p] = { body, headers: req.headers };

    // Gemini
    if (p.startsWith('/gemini/')) {
      if (req.headers['x-goog-api-key'] !== 'g-key') {
        return json(res, 400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } });
      }
      if (p === '/gemini/v1beta/models') {
        return json(res, 200, {
          models: [
            { name: 'models/gemini-test', displayName: 'Gemini Test', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/embedding-001', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
          ],
        });
      }
      const chunk = (o) => `data: ${JSON.stringify(o)}\r\n\r\n`;
      return sse(res, [
        chunk({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }] } }] }),
        chunk({ candidates: [{ content: { parts: [{ text: 'GEMINI ' }] } }] }),
        chunk({
          candidates: [{ content: { parts: [{ text: 'DRAFT' }] }, finishReason: ctl.geminiFinish }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 2 },
        }),
      ]);
    }

    // OpenRouter
    if (p.startsWith('/or/')) {
      if (req.headers.authorization !== 'Bearer or-key') return json(res, 401, { error: { message: 'No auth credentials found', code: 401 } });
      if (p === '/or/key') return json(res, 200, { data: { label: 'test' } });
      if (p === '/or/models') return json(res, 200, { data: [{ id: 'openrouter/auto', name: 'Auto' }, { id: 'meta/llama', name: 'Llama' }] });
      const d = (o) => `data: ${JSON.stringify(o)}\n\n`;
      return sse(res, [
        ': OPENROUTER PROCESSING\n\n',
        d({ model: 'anthropic/claude-x', choices: [{ delta: { content: 'ROUTED ' } }] }),
        d({ model: 'anthropic/claude-x', choices: [{ delta: { content: 'DRAFT' }, finish_reason: ctl.orFinish }] }),
        d({ choices: [], usage: { prompt_tokens: 50, completion_tokens: 2 } }),
        'data: [DONE]\n\n',
      ]);
    }

    // Ollama
    if (p === '/api/tags') return json(res, 200, { models: [{ name: 'llama3:8b', details: { parameter_size: '8B' } }] });
    if (p === '/api/chat') {
      if (body.model !== 'llama3:8b') return json(res, 404, { error: `model "${body.model}" not found, try pulling it first` });
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      res.write(JSON.stringify({ message: { content: '', thinking: 'Let me plan the notice…' }, done: false }) + '\n');
      res.write(JSON.stringify({ message: { content: 'LOCAL ' }, done: false }) + '\n');
      res.write(JSON.stringify({ message: { content: 'DRAFT' }, done: false }) + '\n');
      res.end(JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 70, eval_count: 2 }) + '\n');
      return;
    }

    // OpenAI auth
    if (p === '/auth/.well-known/openid-configuration') {
      return json(res, 200, { issuer: `${base}/auth`, jwks_uri: `${base}/auth/jwks`, revocation_endpoint: `${base}/auth/revoke` });
    }
    if (p === '/auth/jwks') return json(res, 200, { keys: [jwk] });
    if (p === '/auth/revoke') {
      oauth.revoked.push(Object.fromEntries(new URLSearchParams(raw)));
      res.writeHead(200).end();
      return;
    }
    if (p === '/auth/api/accounts/oauth/token') {
      const f = Object.fromEntries(new URLSearchParams(raw));
      oauth.grants.push(f);
      const issue = (nonce) => {
        oauth.access = `at_${crypto.randomUUID()}`;
        oauth.refresh = `rt_${crypto.randomUUID()}`;
        return {
          access_token: oauth.access,
          refresh_token: oauth.refresh,
          id_token: sign({
            iss: `${base}/auth`, aud: oauth.issuedClientId, sub: 'user-1', email: 'advocate@example.com',
            nonce, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000),
          }),
          token_type: 'Bearer',
          expires_in: ctl.expiresIn,
          scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
        };
      };
      if (f.grant_type === 'authorization_code') {
        const c = oauth.codes.get(f.code);
        const challenge = b64url(crypto.createHash('sha256').update(f.code_verifier || '').digest());
        if (!c || c.challenge !== challenge || c.redirect !== f.redirect_uri || f.client_id !== oauth.issuedClientId ||
            f.resource !== 'https://api.openai.com/v1') {
          return json(res, 400, { error: 'invalid_grant' });
        }
        oauth.codes.delete(f.code);
        return json(res, 200, issue(c.nonce));
      }
      if (f.grant_type === 'refresh_token') {
        if (ctl.refreshFail) return json(res, 400, { error: ctl.refreshFail });
        if (f.refresh_token !== oauth.refresh || f.client_id !== oauth.issuedClientId) return json(res, 400, { error: 'refresh_token_reused' });
        const t = issue(undefined);
        delete t.id_token;
        return json(res, 200, t);
      }
    }

    // OpenAI API (plan usage)
    if (p === '/v1/models') {
      if (req.headers.authorization !== `Bearer ${oauth.access}`) return json(res, 401, { detail: 'bad token' });
      return json(res, 200, {
        models: [
          { slug: 'gpt-plan', display_name: 'GPT Plan', visibility: 'list' },
          { slug: 'gpt-hidden', display_name: 'Hidden', visibility: 'hide' },
        ],
      });
    }
    if (p === '/v1/responses') {
      if (req.headers.authorization !== `Bearer ${oauth.access}`) return json(res, 401, { detail: 'bad token' });
      const ev = (type, o = {}) => `event: ${type}\ndata: ${JSON.stringify({ type, ...o })}\n\n`;
      if (ctl.chatgptFail) {
        return sse(res, [
          ev('response.output_text.delta', { delta: 'PART' }),
          ev('response.failed', { response: { error: { code: ctl.chatgptFail, message: 'limit' } } }),
        ]);
      }
      return sse(res, [
        ev('response.created', { response: { id: 'r1' } }),
        ev('response.output_text.delta', { delta: 'PLAN ' }),
        ev('response.output_text.delta', { delta: 'DRAFT' }),
        ev('response.completed', { response: { status: 'completed', usage: { input_tokens: 80, output_tokens: 2 } } }),
      ]);
    }

    res.writeHead(404).end();
  });
});

// The "browser": follows the authorize URL by redirecting straight back.
async function browser(url) {
  const u = new URL(url);
  const q = Object.fromEntries(u.searchParams);
  oauth.authorizeParams = q;
  const code = `code_${crypto.randomUUID()}`;
  oauth.codes.set(code, { challenge: q.code_challenge, redirect: q.redirect_uri, nonce: q.nonce });
  const back = new URL(q.redirect_uri);
  back.searchParams.set('code', code);
  back.searchParams.set('state', q.state);
  back.searchParams.set('scope', 'chatgpt.tokens.use.direct email offline_access openid profile resource.invoke');
  if (q.client_id === 'dynamic_agent_client') back.searchParams.set('client_id', oauth.issuedClientId);
  setTimeout(() => fetch(back).catch(() => {}), 10);
}

const payload = (provider, model) => ({
  provider,
  model,
  template: '',
  references: [],
  facts: 'Deposit of Rs. 2,70,000 not refunded.',
  documents: [{ name: 'Lease.pdf', text: 'Lease dated 12 March 2023.' }],
  maxTokens: 1000,
  budgetChars: 400000,
  includeNotes: false,
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.ADVOCATE_DRAFT_GEMINI_URL = `${base}/gemini`;
  process.env.ADVOCATE_DRAFT_OPENROUTER_URL = `${base}/or`;
  process.env.ADVOCATE_DRAFT_OPENAI_AUTH_URL = `${base}/auth`;
  process.env.ADVOCATE_DRAFT_OPENAI_API_URL = `${base}/v1`;

  const { handlers, call } = await loadMain({ openExternal: browser });
  const gen = async (pl) => {
    const s = fakeSender();
    const res = await handlers['draft:generate']({ sender: s }, pl);
    return { res, deltas: s.deltas, thinking: s.thinking };
  };

  // Status lists all five; only Ollama is ready without setup.
  let st = await call('providers:status');
  assert.deepStrictEqual(st.providers.map((p) => p.id), ['anthropic', 'gemini', 'openrouter', 'chatgpt', 'ollama']);
  assert.deepStrictEqual(st.providers.filter((p) => p.configured).map((p) => p.id), ['ollama']);

  // ---- Gemini
  await call('providers:setKey', { id: 'gemini', key: 'wrong' });
  let m = await call('providers:models', 'gemini');
  assert(!m.ok && /Gemini rejected the API key/.test(m.error), m.error);
  await call('providers:setKey', { id: 'gemini', key: 'g-key' });
  m = await call('providers:models', 'gemini');
  assert(m.ok && m.models.length === 1 && m.models[0].id === 'gemini-test', JSON.stringify(m));
  let { res, deltas, thinking } = await gen(payload('gemini', 'gemini-test'));
  assert(res.ok, res.error);
  assert.strictEqual(res.text, 'GEMINI DRAFT');
  assert.deepStrictEqual(deltas, ['GEMINI ', 'DRAFT'], 'thought parts must not reach the draft');
  assert.strictEqual(thinking, 1, 'thinking not signalled');
  assert.deepStrictEqual(res.usage, { input_tokens: 100, output_tokens: 2 });
  const gb = seen['/gemini/v1beta/models/gemini-test:streamGenerateContent'].body;
  assert(gb.systemInstruction.parts[0].text.length > 50 && gb.contents[0].parts[0].text.includes('## CASE FACTS'));
  ctl.geminiFinish = 'MAX_TOKENS';
  ({ res } = await gen(payload('gemini', 'gemini-test')));
  assert.strictEqual(res.stopReason, 'max_tokens');
  console.log('ok  gemini');

  // ---- OpenRouter
  await call('providers:setKey', { id: 'openrouter', key: 'or-key' });
  m = await call('providers:models', 'openrouter');
  assert(m.ok && m.models.some((x) => x.id === 'meta/llama'));
  ({ res, deltas } = await gen(payload('openrouter', 'openrouter/auto')));
  assert(res.ok, res.error);
  assert.strictEqual(res.text, 'ROUTED DRAFT');
  assert.strictEqual(res.model, 'anthropic/claude-x', 'should report the model OpenRouter actually used');
  assert.deepStrictEqual(res.usage, { input_tokens: 50, output_tokens: 2 });
  const ob = seen['/or/chat/completions'].body;
  assert.strictEqual(ob.messages[0].role, 'system');
  assert.strictEqual(seen['/or/chat/completions'].headers['x-title'], 'Advocate Draft');
  ctl.orFinish = 'length';
  ({ res } = await gen(payload('openrouter', 'openrouter/auto')));
  assert.strictEqual(res.stopReason, 'max_tokens');
  console.log('ok  openrouter');

  // ---- Ollama (local; address configurable)
  await call('providers:setBaseUrl', { id: 'ollama', baseUrl: `${base}/` });
  m = await call('providers:models', 'ollama');
  assert(m.ok && m.models[0].label === 'llama3:8b (8B)');
  ({ res, thinking } = await gen(payload('ollama', 'llama3:8b')));
  assert(res.ok, res.error);
  assert.strictEqual(res.text, 'LOCAL DRAFT', 'thinking must not reach the draft');
  assert.strictEqual(thinking, 1, 'thinking not signalled');
  const lb = seen['/api/chat'].body;
  assert(lb.options.num_ctx >= 8192 && lb.options.num_predict === 1000, 'context window not sized');
  ({ res } = await gen(payload('ollama', 'mistral')));
  assert(!res.ok && /ollama pull mistral/.test(res.error), res.error);
  await call('providers:setBaseUrl', { id: 'ollama', baseUrl: 'http://127.0.0.1:9' });
  ({ res } = await gen(payload('ollama', 'llama3:8b')));
  assert(!res.ok && /Ollama isn't running/.test(res.error), res.error);
  await assert.rejects(async () => call('providers:setBaseUrl', { id: 'ollama', baseUrl: 'not a url' }), /Enter an address/);
  console.log('ok  ollama');

  // ---- Sign in with ChatGPT
  ({ res } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(!res.ok && /Sign in with ChatGPT first/.test(res.error), res.error);

  let si = await call('chatgpt:signIn');
  assert(si.ok, si.error);
  assert.strictEqual(si.email, 'advocate@example.com');
  assert(si.planUsage && si.configured);
  let a = oauth.authorizeParams;
  assert.strictEqual(a.client_id, 'dynamic_agent_client');
  assert.strictEqual(a.agent_name_hint, 'Advocate Draft');
  assert(/^urn:uuid:/.test(a.ext_agent_host_id));
  assert.strictEqual(a.code_challenge_method, 'S256');
  assert(a.scope.includes('chatgpt.tokens.use.direct') && a.resource === 'https://api.openai.com/v1');
  assert(/^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/.test(a.redirect_uri));
  const hostId = a.ext_agent_host_id;

  m = await call('providers:models', 'chatgpt');
  assert(m.ok && m.models.length === 1 && m.models[0].id === 'gpt-plan', 'hidden models must be filtered');
  ({ res, deltas } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(res.ok, res.error);
  assert.strictEqual(res.text, 'PLAN DRAFT');
  const rb = seen['/v1/responses'].body;
  assert(rb.store === false && rb.stream === true && rb.instructions.length > 50, 'required request settings missing');
  assert(!rb.input.some((i) => i.role === 'system'), 'system messages are rejected by this API');

  // Plan limit reached mid-stream: partial text kept, documented message shown.
  ctl.chatgptFail = 'subscription_sharing_usage_limit_exceeded';
  ({ res, deltas } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(!res.ok && /plan usage limit has been reached/.test(res.error) && deltas[0] === 'PART', res.error);
  ctl.chatgptFail = null;

  // Expiring token is refreshed (rotating refresh token) before the call.
  ctl.expiresIn = 60;
  si = await call('chatgpt:signIn');
  a = oauth.authorizeParams;
  assert.strictEqual(a.client_id, oauth.issuedClientId, 'second sign-in must reuse the issued client id');
  assert(!a.agent_name_hint && a.id_token_hint && a.login_hint === 'advocate@example.com');
  assert.strictEqual(a.ext_agent_host_id, hostId, 'host id must be stable');
  const before = oauth.refresh;
  ({ res } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(res.ok, res.error);
  const last = oauth.grants[oauth.grants.length - 1];
  assert(last.grant_type === 'refresh_token' && last.refresh_token === before && oauth.refresh !== before);
  ({ res } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(res.ok, `rotated refresh token not saved: ${res.error}`);

  // Terminal refresh error -> asked to sign in again.
  ctl.refreshFail = 'invalid_grant';
  ({ res } = await gen(payload('chatgpt', 'gpt-plan')));
  assert(!res.ok && /sign-in has expired/.test(res.error), res.error);
  st = await call('providers:status');
  assert(!st.providers.find((p) => p.id === 'chatgpt').configured);
  ctl.refreshFail = null;
  ctl.expiresIn = 3600;

  // Sign out revokes the refresh token and clears it; registration is kept.
  await call('chatgpt:signIn');
  const rt = oauth.refresh;
  const so = await call('chatgpt:signOut');
  assert(so.revoked && !so.signedIn);
  assert.deepStrictEqual(oauth.revoked.pop(), { token: rt, token_type_hint: 'refresh_token', client_id: oauth.issuedClientId });
  await call('chatgpt:signIn');
  assert.strictEqual(oauth.authorizeParams.client_id, oauth.issuedClientId);

  // A tampered ID token is refused.
  const realSign = sign;
  const forged = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const { verifyIdToken } = require('../src/chatgpt-auth');
  const goodClaims = { iss: `${base}/auth`, aud: 'c1', sub: 's', exp: Math.floor(Date.now() / 1000) + 60, nonce: 'n' };
  const opts = { issuer: `${base}/auth`, jwksUri: `${base}/auth/jwks`, audience: 'c1', nonce: 'n' };
  await verifyIdToken(realSign(goodClaims), opts);
  const [h, b] = realSign(goodClaims).split('.');
  const badSig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${h}.${b}`), forged));
  await assert.rejects(verifyIdToken(`${h}.${b}.${badSig}`, opts), /signature/);
  await assert.rejects(verifyIdToken(realSign({ ...goodClaims, aud: 'other' }), opts), /audience/);
  await assert.rejects(verifyIdToken(realSign({ ...goodClaims, nonce: 'x' }), opts), /nonce/);
  await assert.rejects(verifyIdToken(realSign({ ...goodClaims, iss: 'https://evil' }), opts), /issuer/);
  console.log('ok  chatgpt sign-in, refresh, errors, sign-out');

  // Images (Read with AI) are sent in each provider's own format.
  const img = { mediaType: 'image/jpeg', data: Buffer.from('fake-jpeg').toString('base64') };
  const call1 = (p, extra) =>
    require(`../src/providers/${p}`).stream({
      system: 'S', user: 'Transcribe page 1', images: [img], maxTokens: 100,
      signal: new AbortController().signal, onText: () => {}, ...extra,
    });
  ctl.geminiFinish = 'STOP';
  ctl.orFinish = 'stop';
  await call1('gemini', { secret: 'g-key', model: 'gemini-test' });
  const gParts = seen['/gemini/v1beta/models/gemini-test:streamGenerateContent'].body.contents[0].parts;
  assert.deepStrictEqual(gParts[0], { inlineData: { mimeType: 'image/jpeg', data: img.data } });
  assert.deepStrictEqual(gParts[1], { text: 'Transcribe page 1' });
  await call1('openrouter', { secret: 'or-key', model: 'm' });
  const orUser = seen['/or/chat/completions'].body.messages[1];
  assert.deepStrictEqual(orUser.content[0], { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img.data}` } });
  assert.deepStrictEqual(orUser.content[1], { type: 'text', text: 'Transcribe page 1' });
  await call1('chatgpt', { secret: oauth.access, model: 'gpt-plan' });
  const cgIn = seen['/v1/responses'].body.input[0].content;
  assert.deepStrictEqual(cgIn[0], { type: 'input_image', image_url: `data:image/jpeg;base64,${img.data}` });
  assert.deepStrictEqual(cgIn[1], { type: 'input_text', text: 'Transcribe page 1' });
  await call1('ollama', { baseUrl: base, model: 'llama3:8b' });
  const olUser = seen['/api/chat'].body.messages[1];
  assert.deepStrictEqual(olUser.images, [img.data]);
  assert.strictEqual(olUser.content, 'Transcribe page 1');
  // Without images the plain text form is unchanged.
  await call1('ollama', { baseUrl: base, model: 'llama3:8b', images: [] });
  assert(!('images' in seen['/api/chat'].body.messages[1]));
  console.log('ok  images sent in each provider\'s format');

  // Active provider/model is remembered.
  st = await call('providers:status');
  assert.deepStrictEqual(st.active, { provider: 'chatgpt', model: 'gpt-plan' });

  console.log('providers: all passed');
  server.close();
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
