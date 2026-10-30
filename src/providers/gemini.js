'use strict';

// Google Gemini via the Gemini API (Google AI Studio key).

const { ProviderError, isNetworkError, request, sseEvents, statusMessage } = require('./http');

const LABEL = 'Gemini';
const base = () => process.env.ADVOCATE_DRAFT_GEMINI_URL || 'https://generativelanguage.googleapis.com';

function translate(err) {
  if (err instanceof ProviderError || (err && err.name === 'AbortError')) return err;
  if (err && err.status) {
    const e = err.json && err.json.error;
    // Gemini reports a bad key as 400 INVALID_ARGUMENT "API key not valid".
    if (e && /api key not valid|API_KEY_INVALID/i.test(`${e.message} ${JSON.stringify(e.details || '')}`)) {
      return new ProviderError(statusMessage(LABEL, 401), { status: 401 });
    }
    return new ProviderError(statusMessage(LABEL, err.status, e && e.message), { status: err.status });
  }
  if (isNetworkError(err)) return new ProviderError('Could not reach the Gemini API. Check your internet connection.');
  return err;
}

module.exports = {
  id: 'gemini',
  label: 'Gemini (Google)',
  auth: 'key',
  keyUrl: 'https://aistudio.google.com/apikey',
  keyPlaceholder: 'AIza…',
  privacy:
    'Documents are sent to Google. On the free tier Google may use them to improve its products — use a paid (billing-enabled) key for client work.',
  defaultModel: 'gemini-2.5-pro',
  fallbackModels: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],

  async listModels({ secret }) {
    try {
      const res = await request(`${base()}/v1beta/models?pageSize=1000`, { headers: { 'x-goog-api-key': secret } });
      const { models = [] } = await res.json();
      return models
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name))
        .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }));
    } catch (err) {
      throw translate(err);
    }
  },

  async stream({ secret, model, system, user, images = [], maxTokens, signal, onText, onThinking = () => {} }) {
    let text = '';
    let usage = null;
    let finish = null;
    try {
      const res = await request(
        `${base()}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': secret },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              {
                role: 'user',
                parts: [...images.map((im) => ({ inlineData: { mimeType: im.mediaType, data: im.data } })), { text: user }],
              },
            ],
            // Thinking models spend part of this on reasoning, so allow headroom.
            generationConfig: { maxOutputTokens: Math.max(maxTokens, 24576) },
          }),
          signal,
        }
      );
      for await (const { data } of sseEvents(res)) {
        const chunk = JSON.parse(data);
        if (chunk.error) throw new ProviderError(`${LABEL}: ${chunk.error.message}`);
        if (chunk.promptFeedback && chunk.promptFeedback.blockReason) {
          throw new ProviderError(`${LABEL} declined the request (${chunk.promptFeedback.blockReason}).`);
        }
        const cand = chunk.candidates && chunk.candidates[0];
        for (const part of (cand && cand.content && cand.content.parts) || []) {
          if (part.thought) onThinking();
          else if (part.text) {
            text += part.text;
            onText(part.text);
          }
        }
        if (cand && cand.finishReason) finish = cand.finishReason;
        if (chunk.usageMetadata) {
          usage = {
            input_tokens: chunk.usageMetadata.promptTokenCount,
            output_tokens: chunk.usageMetadata.candidatesTokenCount,
          };
        }
      }
    } catch (err) {
      throw signal.aborted ? err : translate(err);
    }
    if (finish && !['STOP', 'MAX_TOKENS'].includes(finish) && !text) {
      throw new ProviderError(`${LABEL} stopped without a draft (${finish}).`);
    }
    return { text: text.trim(), model, usage, stopReason: finish === 'MAX_TOKENS' ? 'max_tokens' : 'end' };
  },
};
