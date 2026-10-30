'use strict';

// Claude via the Anthropic API, with the advocate's own API key.

const { ProviderError, isNetworkError, statusMessage } = require('./http');

const LABEL = 'Claude';

function translate(err) {
  if (err instanceof ProviderError) return err;
  if (err && err.status) {
    const detail = err.error && err.error.error && err.error.error.message;
    return new ProviderError(statusMessage(LABEL, err.status, err.status === 400 ? detail : ''), { status: err.status });
  }
  if (isNetworkError(err)) return new ProviderError('Could not reach the Anthropic API. Check your internet connection.');
  return err;
}

const client = (apiKey) => {
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic({ apiKey, maxRetries: 1 });
};

module.exports = {
  id: 'anthropic',
  label: 'Claude (Anthropic)',
  auth: 'key',
  keyUrl: 'https://console.anthropic.com/settings/keys',
  keyPlaceholder: 'sk-ant-…',
  privacy: 'Documents are sent to Anthropic. API data is not used for training by default.',
  defaultModel: 'claude-sonnet-5-5',
  fallbackModels: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — highest quality' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — balanced' },
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — fast / cheap' },
  ],

  async listModels({ secret }) {
    try {
      const page = await client(secret).models.list({ limit: 100 });
      return page.data.map((m) => ({ id: m.id, label: m.display_name || m.id }));
    } catch (err) {
      throw translate(err);
    }
  },

  // images: optional [{ mediaType, data (base64) }] sent before the text.
  async stream({ secret, model, system, user, images = [], maxTokens, signal, onText }) {
    const content = images.length
      ? [
          ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } })),
          { type: 'text', text: user },
        ]
      : user;
    const s = client(secret).messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    });
    const onAbort = () => s.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    s.on('text', onText);
    try {
      const resp = await s.finalMessage();
      const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return {
        text,
        model: resp.model || model,
        usage: resp.usage ? { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens } : null,
        stopReason: resp.stop_reason === 'max_tokens' ? 'max_tokens' : 'end',
      };
    } catch (err) {
      throw signal.aborted ? err : translate(err);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  },
};
