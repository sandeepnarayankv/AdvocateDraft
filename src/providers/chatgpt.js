'use strict';

// OpenAI models paid for by the advocate's ChatGPT plan, through OpenAI's
// "Sign in with ChatGPT" flow (preview). The access token comes from
// chatgpt-auth.js; requests go to the public Responses API only.

const { ProviderError, isNetworkError, request, sseEvents } = require('./http');

const base = () => process.env.ADVOCATE_DRAFT_OPENAI_API_URL || 'https://api.openai.com/v1';

// Documented structured error codes -> what to tell the advocate.
const CODE_MESSAGES = {
  subscription_sharing_user_not_eligible: 'ChatGPT plan usage isn’t available for this account, workspace or region.',
  subscription_sharing_usage_limit_exceeded:
    'Your ChatGPT plan usage limit has been reached. See ChatGPT → Settings → Usage, or switch to another provider.',
  subscription_sharing_usage_unavailable: 'ChatGPT usage couldn’t be checked right now. Try again shortly.',
  subscription_sharing_unsupported_capability: 'This request uses something ChatGPT plan usage doesn’t support',
  subscription_sharing_route_not_supported: 'This request route isn’t supported for ChatGPT plan usage.',
  subscription_sharing_invalid_user: 'Your ChatGPT session couldn’t be validated. Sign in again under ⚙ AI providers.',
  subscription_sharing_user_unavailable: 'ChatGPT account details are temporarily unavailable. Try again shortly.',
  chatpass_v2_scope_not_authorized: 'This app isn’t authorised to use your ChatGPT plan. Sign in again and allow plan usage.',
  chatpass_v2_invalid_authorization_context: 'This app isn’t authorised to use your ChatGPT plan. Sign in again and allow plan usage.',
};

function fromCode(code, message, param, status) {
  let text = CODE_MESSAGES[code];
  if (text && code === 'subscription_sharing_unsupported_capability') text += param ? ` (${param}).` : '.';
  return new ProviderError(text || `ChatGPT: ${message || code || 'request failed'}.`, {
    status,
    code,
    retryable: /unavailable/.test(code || '') || status === 503,
  });
}

function translate(err) {
  if (err instanceof ProviderError || (err && err.name === 'AbortError')) return err;
  if (err && err.status) {
    const e = err.json && err.json.error;
    if (e && e.code) return fromCode(e.code, e.message, e.param, err.status);
    if (err.status === 401) return new ProviderError('Your ChatGPT sign-in wasn’t accepted. Sign in again under ⚙ AI providers.', { status: 401 });
    if (err.status === 403) return new ProviderError('ChatGPT plan usage isn’t permitted here (policy or region restriction).', { status: 403 });
    if (err.status === 503) return new ProviderError('ChatGPT plan routing is temporarily unavailable. Try again shortly.', { status: 503, retryable: true });
    if (err.status === 429) return new ProviderError('ChatGPT is rate-limiting requests. Wait a minute and try again.', { status: 429 });
    const detail = (err.json && err.json.detail) || '';
    return new ProviderError(`ChatGPT returned an error (HTTP ${err.status})${detail ? `: ${detail}` : ''}.`, { status: err.status });
  }
  if (isNetworkError(err)) return new ProviderError('Could not reach OpenAI. Check your internet connection.');
  return err;
}

const auth = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

module.exports = {
  id: 'chatgpt',
  label: 'ChatGPT (sign in with your plan)',
  auth: 'oauth',
  keyUrl: 'https://developers.openai.com/siwc',
  privacy:
    'Documents are sent to OpenAI under your ChatGPT account and follow its data controls. For client work, turn off “Improve the model for everyone” in ChatGPT → Settings → Data controls.',
  defaultModel: '',
  fallbackModels: [],
  CODE_MESSAGES,

  async listModels({ secret }) {
    try {
      const res = await request(`${base()}/models`, { headers: auth(secret) });
      const body = await res.json();
      // Plan-usage listing: { models: [{ slug, display_name, visibility }] }.
      if (Array.isArray(body.models)) {
        return body.models
          .filter((m) => m.visibility === 'list')
          .map((m) => ({ id: m.slug, label: m.display_name || m.slug }));
      }
      return (body.data || []).map((m) => ({ id: m.id, label: m.id }));
    } catch (err) {
      throw translate(err);
    }
  },

  async stream({ secret, model, system, user, images = [], signal, onText, onThinking = () => {} }) {
    let text = '';
    let usage = null;
    let stopReason = null;
    try {
      const res = await request(`${base()}/responses`, {
        method: 'POST',
        headers: auth(secret),
        // store:false and stream:true are required; system text goes in
        // `instructions` because system message items are rejected.
        body: JSON.stringify({
          model,
          instructions: system,
          input: [
            {
              role: 'user',
              content: images.length
                ? [
                    ...images.map((im) => ({ type: 'input_image', image_url: `data:${im.mediaType};base64,${im.data}` })),
                    { type: 'input_text', text: user },
                  ]
                : user,
            },
          ],
          store: false,
          stream: true,
        }),
        signal,
      });
      for await (const { event, data } of sseEvents(res)) {
        const ev = JSON.parse(data);
        const type = ev.type || event;
        if (type === 'response.output_text.delta' && ev.delta) {
          text += ev.delta;
          onText(ev.delta);
        } else if (/^response\.reasoning/.test(type)) {
          onThinking();
        } else if (type === 'response.completed' || type === 'response.incomplete') {
          const r = ev.response || {};
          if (r.usage) usage = { input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens };
          const reason = r.incomplete_details && r.incomplete_details.reason;
          stopReason = type === 'response.completed' ? 'end' : reason === 'max_output_tokens' ? 'max_tokens' : 'incomplete';
        } else if (type === 'response.failed') {
          const e = (ev.response && ev.response.error) || {};
          throw fromCode(e.code, e.message, e.param);
        } else if (type === 'error') {
          throw fromCode(ev.code || (ev.error && ev.error.code), ev.message || (ev.error && ev.error.message), ev.param);
        }
      }
    } catch (err) {
      throw signal.aborted ? err : translate(err);
    }
    // Only response.completed (or .incomplete) means the stream finished.
    if (!stopReason) throw new ProviderError('The ChatGPT response was interrupted before it finished. The partial draft is kept.');
    return { text: text.trim(), model, usage, stopReason: stopReason === 'end' ? 'end' : 'max_tokens' };
  },
};
