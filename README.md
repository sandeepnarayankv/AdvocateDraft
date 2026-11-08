# Advocate Draft

A desktop app that drafts legal documents from **case facts** and **source documents**, in an **output format you provide**, using the AI service the advocate chooses. Everything stays on your machine — the only outbound call is to the chosen provider when you click *Generate* (none at all with Ollama).

## AI providers

Choose under **AI provider** (top bar); set up under **⚙ AI providers**.

| Provider | How you connect | Where documents go |
|---|---|---|
| Claude (Anthropic) | Your API key | Anthropic (API data not used for training by default) |
| Gemini (Google) | Your Google AI Studio key | Google — on the free tier Google may use it to improve products; use a billing-enabled key for client work |
| OpenRouter | Your OpenRouter key — one key, many models | OpenRouter and the model's own provider |
| ChatGPT | **Sign in with ChatGPT** — uses your ChatGPT plan, no API key | OpenAI, under your ChatGPT account's data controls |
| Ollama | Nothing — models run on this computer | Nowhere; stays on this computer |

- Keys and ChatGPT sign-ins are encrypted with the OS keychain. **Test** checks a key and loads that provider's live model list; you can also type any model id.
- **Sign in with ChatGPT** is OpenAI's preview "token sharing" flow: your browser signs in, the app registers itself once, and tokens are refreshed automatically and revoked on sign-out. OpenAI documents it for open-source clients; a closed-source release may need a client ID from OpenAI.
- **Claude Pro/Max subscriptions cannot be used** — Anthropic only allows subscription sign-in in its own apps, so Claude needs an API key (or use Claude models through OpenRouter).
- **Ollama** needs [Ollama](https://ollama.com/download) running with a model pulled (`ollama pull <model>`). Local models are slower and invent more — use the Small context budget and check every paragraph.

## What it does

1. **Output format** — any mix of:
   - a **template**: a blank format, followed exactly and filled in;
   - a **previous document** from another matter: its structure and language are reused, its facts are not. After each draft, names, amounts and dates that appear in both the draft and the previous document — but nowhere in this matter's facts or documents — are flagged for review;
   - written format instructions.
2. **Case facts** — type the facts of the matter.
3. **Source documents** — add PDF / DOCX / TXT files or photos of documents; their text is extracted on this computer. **Scanned PDFs and photos are read with OCR** (Tesseract, bundled — nothing is uploaded): each PDF page uses its text layer if it has one, and only pages without text are scanned. Progress shows page by page, removing a file stops its reading, and **View** shows the text that was read. Choose the language of scans next to *Add files…* — English, or English with Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, Punjabi, Odia or Urdu. Low-quality scans are flagged, and documents read by OCR are labelled in the prompt so names and figures are treated with care. Always compare amounts and names in OCR text with the original.
4. **Generate** — assembles a grounded prompt and sends it to the chosen provider. The draft streams in as it is written (reasoning models show a "reasoning…" timer first); **Stop** ends it early and keeps the partial text.
5. **Review & export** — edit the draft and export to `.docx`. Choose the **Word format** next to Export:
   - *as &lt;your .docx template or previous document&gt;* — keeps that file's page size, margins, letterhead header/footer and body font, and replaces only its body with the draft. Its title/author properties are cleared, and the kept header/footer text is shown so you can check it doesn't belong to the old matter;
   - *standard court format* — A4, Times New Roman 12, 1.5 spacing, 1.5" left margin, page numbers.

   In both, all-caps lines become centred bold headings, "Versus" is centred, numbered paragraphs get a hanging indent, body text is justified, and every `[TO CONFIRM]` is highlighted yellow.

The model is instructed to use only the supplied facts/documents, mark missing details as `[TO CONFIRM: ___]`, and not invent citations.

### Built-in Indian formats

**Choose a format…** (in *Output format*) offers 50 formats. Each lists its court, governing law, the facts it needs and the documents usually filed with it, and shows the skeleton. Using one adds it as the matter's template, adds its drafting notes to the format instructions, and — if the facts box is empty — fills it with a checklist to complete.

| Area | Formats |
|---|---|
| Civil (CPC) | Plaint for recovery of money · Plaint for declaration and permanent injunction · Written statement · Temporary injunction (O.XXXIX R.1&2) · Summary suit (O.XXXVII) · Execution petition (O.XXI R.11(2)) · Regular first appeal (s.96, O.XLI) · Condonation of delay (s.5 Limitation Act) · Caveat (s.148A) |
| Criminal (BNSS / BNS) | Regular bail — Magistrate (s.480) · Bail — Sessions / High Court (s.483) · Anticipatory bail (s.482) · Cheque bounce complaint (s.138 NI Act) · Private complaint (s.223) · Direction to investigate (s.175(3)) · Quashing petition (s.528) · Criminal revision (s.438) |
| Family & consumer | Divorce (HMA s.13) · Mutual consent divorce (s.13B) · Restitution of conjugal rights (s.9) · Maintenance (BNSS s.144) · Domestic violence (PWDVA s.12) · Child custody (GWA s.7/25) · Consumer complaint (CPA 2019 s.35) |
| Notices, deeds & affidavits | Legal notice · Cheque dishonour notice (s.138(b)) · Reply to notice · Notice to Government (s.80 CPC) · Termination of tenancy (s.106 TPA) · General affidavit · Affidavit of evidence (O.XVIII R.4) · Vakalatnama · Rental / leave and licence agreement · Agreement to sell · General power of attorney · Special power of attorney |
| Writs | Writ petition — certiorari / mandamus (Art. 226) · Habeas corpus |
| Motor accident claims | Claim for death (MV Act s.166) · Claim for injury (s.166) |
| Arbitration | Notice invoking arbitration (s.21) · Interim measures (s.9) · Appointment of arbitrator (s.11) · Setting aside an award (s.34) · Enforcing an award (s.36) |
| Rent & eviction | Eviction petition under the State rent law · Suit for possession and mesne profits (s.106 / s.111 TPA) |
| RTI | Application (s.6(1)) · First appeal (s.19(1)) · Second appeal to the Information Commission (s.19(3)) |

Formats are starting points: court fees, stamp duty, registration and local practice vary by State and court, and are left as placeholders. The criminal formats follow the BNSS/BNS (in force from 1 July 2024); check whether an older offence or case still falls under the IPC/CrPC.

### Meaning-based search

When source documents are too long to send whole, passages are picked by keyword (BM25). Tick **Meaning-based search** to also pick them by meaning — for example a passage saying "advance" when the facts say "deposit", or one in an Indian language. The first time, it asks to download a multilingual model (`multilingual-e5-small`, about 130 MB) from Hugging Face; afterwards it runs entirely on this computer with downloading switched off, and documents are never uploaded for it. Each passage is scored by its best-matching sentence, so one relevant line in a page of routine entries still counts, and the keyword and meaning rankings are merged (reciprocal rank fusion) so neither can push out the other's best matches. It is a small model: it helps, but exact names, dates and section numbers still come mainly from keywords. The usage line after a draft says whether passages were picked "by keyword" or "by keyword + meaning".

### Translation

**⇄ Translate a document** (top bar) uploads a file just to translate it — PDF (including scans), Word, text or a photo of a document. It is read on this computer (with OCR for scans; **Read with AI** is available for handwriting), and the translation window opens as soon as it is read. Such files are kept in the matter but marked **Not in draft**, so they are never sent when drafting; every source document has this **In draft / Not in draft** switch.

**Translate** on any document opens the original and the translation side by side. Choose the source language (or detect automatically) and the target — English or any of 11 Indian languages. The selected AI provider translates it, in parts for long documents, with progress and Stop. Names, numbers, dates and case numbers are kept exactly; unclear text is marked `[illegible]` rather than guessed. The translation is editable, saved with the matter, and exports to Word with a **certificate of translation** for the translator to complete and sign — the app's translation is a draft, not a certified one. The instructions are in **✎ Prompts → Translation instructions**. Drafting still reads the original document.

### Handwritten documents and poor scans

The built-in OCR is for printed text. For handwriting (or a scan it reads badly — flagged in the document list), **Read with AI** sends the images of the scanned pages to the selected AI model, one page at a time, and replaces the document's text with the model's transcription in the original language and script. Pages that already have a text layer are not sent. You are asked to confirm first, with the provider named: with a cloud provider the page images leave the computer; with Ollama (and a local vision model) they do not. The model must accept images. Transcriptions mark `[illegible]`, `[signature]`, `[seal: …]` etc., are labelled in the drafting prompt, and must be checked against the original. Instructions: **✎ Prompts → Handwriting / scan reading instructions**.

### Saved matters

Everything for a matter — its name, format, facts, documents, draft and warnings — is saved automatically a second after each change, and the last matter reopens when the app starts. **New matter** starts afresh; **Open…** lists saved matters (search, open, delete). Matters are stored in the app's data folder, one file each, encrypted with the OS keychain.

### Editing the prompts

**✎ Prompts** (top right) shows every instruction sent to the AI (the same for every provider), split into sections, each used only in its situation (e.g. *Previous document rule* only when one is added). Edit any section, reset it to default, and preview the exact text that would be sent for the current inputs — including unsaved edits — before spending API credits. Changes are saved to `prompts.json` in the app's data folder. **Export / Import** shares improved prompts with colleagues; an import is shown for review and only applied on Save.

## Install (Windows)

Download `Advocate-Draft-Setup-<version>.exe` from the [Releases page](https://github.com/sandeepnarayankv/AdvocateDraft/releases) and run it. It installs for the current user (no administrator rights needed), lets you choose the folder, and adds Start menu and desktop shortcuts and an entry in *Add or remove programs*. Uninstalling keeps your matters, keys and settings (in `%APPDATA%\Advocate Draft`).

The installer is not yet code-signed, so Windows SmartScreen shows "Windows protected your PC" on first run: choose **More info → Run anyway**. Signing it needs a code-signing certificate.

### Building the installer

```bash
npm run dist
```

Produces `dist/Advocate-Draft-Setup-<version>.exe` (about 160 MB — mostly Electron and the OCR language data). The app is packaged without an asar archive because the PDF reader (an ES module) and the OCR worker (a separate Node process) load from real files. To check that document reading works inside the packaged app:

```bash
set ELECTRON_RUN_AS_NODE=1
"dist\win-unpacked\Advocate Draft.exe" build\verify-package.js <a scanned PDF> <a text PDF>
```

`npm run icon` regenerates `build/icon.png`.

## Run from source

```bash
npm install
npm start
```

Then open **⚙ AI providers** (top right) and set up at least one provider. With Ollama running, the app works with no setup at all.

## Tests

```bash
npm test
```

Runs the retrieval, carry-over, prompt, Word-export and settings tests, plus end-to-end tests of the main process against mock Anthropic, Gemini, OpenRouter, Ollama and OpenAI servers — including the full Sign in with ChatGPT flow (registration, signed ID tokens, refresh with rotation, expiry, revocation). No keys or network needed.

```bash
npm run smoke
```

Starts the real app in Electron with a throwaway data folder (your settings and matters are untouched), checks the window — providers, prompt editor, autosave, new/open matter, reopening after a restart — and exits with a pass/fail report.

## Project layout

- `src/main.js` — Electron main process: document parsing, prompt assembly, generation, export, and the window's IPC.
- `src/providers/` — one module per AI service (`anthropic`, `gemini`, `openrouter`, `chatgpt`, `ollama`) behind a common streaming interface; `http.js` holds shared streaming and error helpers.
- `src/chatgpt-auth.js` — Sign in with ChatGPT: loopback OAuth with PKCE, ID-token verification, refresh, revocation.
- `src/credentials.js` — settings and encrypted secrets (`config.json` in the app's data folder).
- `src/matters.js` — saved matters: one encrypted file per matter plus an encrypted index.
- `src/ocr/` — document reading: `pipeline.js` (pdf.js text layer + Tesseract OCR for scanned pages and images, with clean-up of common OCR slips in amounts), `worker.js` (runs it in a separate background process), `service.js` (job queue, progress, cancel, restart).
- `src/translate.js` — translation: splitting long documents, prompts, the filing version with certificate.
- `src/formats/` — the built-in Indian formats, one file per area, with shared blocks (verification, affidavit, advocate signature) in `common.js`.
- `src/prompts.js` — editable prompt sections, their defaults, save/import/export, and prompt assembly.
- `src/precedent.js` — template / previous-document handling and the carry-over check.
- `src/docx-export.js` — Word export into a base .docx (yours or the standard format).
- `src/semantic.js` and `src/ocr/embedder.js` — meaning-based search: the setting and one-time model download, sentence-window scoring with a session cache, and the embedding model run in the background worker.
- `src/rag.js` — local retrieval: passage chunking + BM25 ranking. Sends full text when it fits the context budget, otherwise the most relevant passages (each document's opening passage is always kept).
- `src/preload.js` — safe IPC bridge (context isolation on, no Node in the renderer).
- `src/renderer/` — the UI (`index.html`, `styles.css`, `renderer.js`).

## Status: early prototype

Known next steps:
- Code-sign the installer.
- Verify Claude and Gemini with real accounts (Ollama, OpenRouter and Sign in with ChatGPT have been tested live).
- Review of the built-in formats by practising advocates.

Setting up on a new machine with npm 11+: npm holds back Electron's download step. Run `npm install-scripts approve electron` (or `npm rebuild electron`) after `npm install` if `npm start` cannot find Electron.

> ⚠ Drafts are AI-generated. Always review for accuracy, citations, and compliance before any filing or use. The built-in formats are starting points, not legal advice.

## Contributing

Issues and pull requests are welcome — especially corrections to the built-in formats from practising advocates, and State-specific variants (court fees, rent laws, forms). Please run `npm test` and `npm run smoke` before sending a change.

## Licence

Copyright © 2026 Sandeep

Advocate Draft is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. It is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See [LICENSE](LICENSE) for the full text.

Third-party components keep their own licences — mostly MIT, Apache-2.0 and BSD, including Electron, pdf.js, Tesseract.js and its language data (Apache-2.0), and the optional `multilingual-e5-small` search model (MIT); the bundled image library includes libvips (LGPL-3.0).
