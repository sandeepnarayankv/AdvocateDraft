'use strict';

// Ollama: models running on this computer. Nothing leaves the machine.

const { ProviderError, isNetworkError, request, ndjson } = require('./http');

const DEFAULT_URL = 'http://127.0.0.1:11434';

function translate(err, baseUrl, model) {
  if (err instanceof ProviderError || (err && err.name === 'AbortError')) return err;
  if (err && err.status === 404) {
    return new ProviderError(`The model "${model}" isn't installed in Ollama. Install it with: ollama pull ${model}`, { status: 404 });
  }
  if (err && err.status) {
    const detail = (err.json && err.json.error) || err.text;
    return new ProviderError(`Ollama returned an error (HTTP ${err.status})${detail ? `: ${detail}` : ''}.`, { status: err.status });
  }
  if (isNetworkError(err)) {
    return new ProviderError(`Ollama isn't running at ${baseUrl}. Start the Ollama app, or check the address under ⚙ AI providers.`);
  }
  return err;
}

// Ollama's default context window is small and silently drops anything
// beyond it, so size it to the prompt (≈3 characters per token, plus output).
function contextSize(promptChars, maxTokens) {
  const needed = Math.ceil(promptChars / 3) + maxTokens;
  return Math.min(131072, Math.max(8192, Math.ceil(needed / 1024) * 1024));
}

module.exports = {
  id: 'ollama',
  label: 'Ollama (on this computer)',
  auth: 'local',
  defaultUrl: DEFAULT_URL,
  keyUrl: 'https://ollama.com/download',
  privacy: 'Runs entirely on this computer — documents never leave it.',
  defaultModel: '',
  fallbackModels: [],
  contextSize,

  async listModels({ baseUrl }) {
    const url = baseUrl || DEFAULT_URL;
    try {
      const res = await request(`${url}/api/tags`);
      const { models = [] } = await res.json();
      return models.map((m) => ({
        id: m.name,
        label: m.details && m.details.parameter_size ? `${m.name} (${m.details.parameter_size})` : m.name,
      }));
    } catch (err) {
      throw translate(err, url);
    }
  },

  async stream({ baseUrl, model, system, user, images = [], maxTokens, signal, onText, onThinking = () => {} }) {
    const url = baseUrl || DEFAULT_URL;
    let text = '';
    let usage = null;
    let doneReason = null;
    try {
      const res = await request(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: 'system', content: system },
            images.length ? { role: 'user', content: user, images: images.map((im) => im.data) } : { role: 'user', content: user },
          ],
          options: { num_ctx: contextSize(system.length + user.length, maxTokens), num_predict: maxTokens },
        }),
        signal,
      });
      for await (const chunk of ndjson(res)) {
        if (chunk.error) throw new ProviderError(`Ollama: ${chunk.error}`);
        // Reasoning models report their thinking separately; it is not draft text.
        if (chunk.message && chunk.message.thinking) onThinking();
        const delta = chunk.message && chunk.message.content;
        if (delta) {
          text += delta;
          onText(delta);
        }
        if (chunk.done) {
          doneReason = chunk.done_reason;
          usage = { input_tokens: chunk.prompt_eval_count, output_tokens: chunk.eval_count };
        }
      }
    } catch (err) {
      throw signal.aborted ? err : translate(err, url, model);
    }
    return { text: text.trim(), model, usage, stopReason: doneReason === 'length' ? 'max_tokens' : 'end' };
  },
};
