'use strict';

// OpenRouter: one key, many models (Claude, GPT, Gemini, Llama, …).

const { ProviderError, isNetworkError, request, sseEvents, statusMessage } = require('./http');

const LABEL = 'OpenRouter';
const base = () => process.env.ADVOCATE_DRAFT_OPENROUTER_URL || 'https://openrouter.ai/api/v1';
const headers = (secret) => ({
  'content-type': 'application/json',
  authorization: `Bearer ${secret}`,
  'X-Title': 'Advocate Draft',
});

function translate(err) {
  if (err instanceof ProviderError || (err && err.name === 'AbortError')) return err;
  if (err && err.status) {
    const e = err.json && err.json.error;
    return new ProviderError(statusMessage(LABEL, err.status, e && e.message), { status: err.status });
  }
  if (isNetworkError(err)) return new ProviderError('Could not reach OpenRouter. Check your internet connection.');
  return err;
}

module.exports = {
  id: 'openrouter',
  label: 'OpenRouter',
  auth: 'key',
  keyUrl: 'https://openrouter.ai/settings/keys',
  keyPlaceholder: 'sk-or-…',
  privacy:
    "Documents go to OpenRouter and on to the chosen model's provider. Each provider has its own data policy — check it in OpenRouter's privacy settings.",
  defaultModel: 'openrouter/auto',
  fallbackModels: [{ id: 'openrouter/auto', label: 'Auto (OpenRouter picks a model)' }],

  async listModels({ secret }) {
    try {
      // The model list is public; checking the key needs an authenticated call.
      await request(`${base()}/key`, { headers: headers(secret) });
      const res = await request(`${base()}/models`, { headers: headers(secret) });
      const { data = [] } = await res.json();
      return data.map((m) => ({ id: m.id, label: m.name || m.id }));
    } catch (err) {
      throw translate(err);
    }
  },

  async stream({ secret, model, system, user, images = [], maxTokens, signal, onText, onThinking = () => {} }) {
    let text = '';
    let usage = null;
    let finish = null;
    let servedBy = model;
    try {
      const res = await request(`${base()}/chat/completions`, {
        method: 'POST',
        headers: headers(secret),
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          usage: { include: true },
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: images.length
                ? [
                    ...images.map((im) => ({ type: 'image_url', image_url: { url: `data:${im.mediaType};base64,${im.data}` } })),
                    { type: 'text', text: user },
                  ]
                : user,
            },
          ],
        }),
        signal,
      });
      for await (const { data } of sseEvents(res)) {
        if (data === '[DONE]') break;
        const chunk = JSON.parse(data);
        if (chunk.error) throw new ProviderError(`${LABEL}: ${chunk.error.message || 'the model returned an error'}.`);
        if (chunk.model) servedBy = chunk.model;
        const choice = chunk.choices && chunk.choices[0];
        if (choice && choice.delta && (choice.delta.reasoning || choice.delta.reasoning_details)) onThinking();
        const delta = choice && choice.delta && choice.delta.content;
        if (delta) {
          text += delta;
          onText(delta);
        }
        if (choice && choice.finish_reason) finish = choice.finish_reason;
        if (chunk.usage) usage = { input_tokens: chunk.usage.prompt_tokens, output_tokens: chunk.usage.completion_tokens };
      }
    } catch (err) {
      throw signal.aborted ? err : translate(err);
    }
    return { text: text.trim(), model: servedBy, usage, stopReason: finish === 'length' ? 'max_tokens' : 'end' };
  },
};
