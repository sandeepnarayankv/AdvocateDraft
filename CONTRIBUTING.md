# Contributing to Advocate Draft

Thank you for helping. Advocate Draft is built for Indian advocates, so two kinds of contribution are especially valuable:

- **Legal accuracy** — corrections to the built-in formats, statutory references, limitation periods, and State-specific practice. You do not need to write code: open a **Format correction** issue and describe the fix.
- **Code** — bug fixes, new providers, better OCR, accessibility, and support for more courts and States.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting problems

Use the issue forms on the [Issues page](https://github.com/sandeepnarayankv/AdvocateDraft/issues/new/choose):

- **Bug report** — something does not work as described.
- **Format correction** — a built-in format is wrong, outdated, or missing something a court requires.
- **Feature request** — something new.

**Never post client information** (names, facts, documents, drafts) or API keys in an issue. Describe the problem with made-up details.

Security problems (for example, anything that could expose stored keys or client documents) must **not** be reported in a public issue — see [SECURITY.md](SECURITY.md).

## Setting up

You need Windows, [Node.js](https://nodejs.org) 22 or later, and Git.

```bash
git clone https://github.com/sandeepnarayankv/AdvocateDraft.git
cd AdvocateDraft
npm install
npm start
```

With npm 11 or later, npm may hold back Electron's download step; if `npm start` cannot find Electron, run `npm rebuild electron`.

The app works without any API key if [Ollama](https://ollama.com) is running with a model installed.

## Tests

```bash
npm test         # unit and integration tests; mock AI providers, no keys or network
npm run smoke    # starts the real app with a throwaway data folder and checks the window
```

Please run both before opening a pull request, and add tests for what you change. The test suites never use real keys or real client data — keep it that way.

## Project layout

See *Project layout* in the [README](README.md). In short: `src/main.js` (main process), `src/renderer/` (window), `src/providers/` (AI services), `src/formats/` (built-in formats), `src/ocr/` (document reading), `src/prompts.js` (instructions sent to the AI).

## Changing the built-in formats

Formats live in `src/formats/`, one file per area. Each format has:

- `title`, `category`, `forum`, `law`, `use` — shown in the picker;
- `facts` — the checklist that fills the facts box;
- `annexures` — documents usually filed with it;
- `instructions` — drafting notes for the AI (include limitation periods and statutory requirements here);
- `template` — the skeleton, with `[PLACEHOLDERS]` in capitals.

When you change a format:

1. Cite the provision and, for anything unsettled, say so in the instructions rather than stating one view as settled.
2. Leave State-specific details (court fees, stamp duty, forum names) as placeholders unless the format is for one State.
3. Add or update the checks in `test/formats.test.js`.

## Changing the prompts

The default instructions sent to the AI are in `src/prompts.js`. Prompt changes can make drafts better or worse in ways tests do not catch, so in the pull request describe how you compared the old and new versions (which model, which test matter, what changed in the output).

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep each pull request to one change, with a clear description of what and why.
3. Make sure `npm test` and `npm run smoke` pass. The tests also run automatically on every pull request.
4. By submitting a pull request you agree that your contribution is licensed under the project's licence, the [GNU AGPL v3.0 or later](LICENSE).

## Style

- Match the surrounding code: plain CommonJS JavaScript, small functions, comments that explain *why*.
- Text shown to advocates should be plain, specific and polite — say what happened and what to do next.
- Keep everything local by default: nothing should leave the advocate's computer except the request to the AI provider they chose.
