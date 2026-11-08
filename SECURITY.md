# Security policy

Advocate Draft stores API keys and ChatGPT sign-in tokens, and handles confidential client documents, so security reports are taken seriously.

## Reporting a vulnerability

**Please do not open a public issue.** Instead, report it privately through GitHub:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and its impact.

Never include real client documents, real API keys or real sign-in tokens in a report — use made-up data.

You can expect an acknowledgement within a few days. Once a fix is released, you will be credited in the release notes if you wish.

## What counts

For example:

- anything that could expose stored API keys, ChatGPT tokens, or saved matters;
- client data leaving the computer other than in the request to the AI provider the advocate chose;
- a document (PDF, Word, image) that can make the app run code or read files it should not;
- weaknesses in the Sign in with ChatGPT flow.

## Supported versions

Security fixes are made for the latest release.
