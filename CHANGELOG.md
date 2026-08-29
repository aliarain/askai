# Changelog

## 2.0.0

Breaking. Every deep-link parameter was re-verified against vendor
documentation and shipping implementations; six of the ten destinations in
1.x were wrong.

### Destinations

- `gemini` and `copilot` (Microsoft) are now **deprecated and throw**. Gemini
  has never supported URL prompt prefill; Microsoft Copilot's was removed in
  late 2025. Both previously opened an empty chat with no error. Use
  `aistudio` for a Google model and `github-copilot` for GitHub's product.
- `chatgpt` now uses `?prompt=` instead of `?q=`.
- `aistudio` now uses `?prompt=` instead of `?q=`.
- `perplexity` now points at `/search/new`.
- `claude`'s cap is 14,000 characters, down from a claimed 100,000.
- Added: T3 Chat, HuggingChat, Duck.ai, Z.ai, Kimi, Qwen Chat, Cursor,
  GitHub Copilot, v0, Scira.
- Every destination now carries a tier. `'all'` resolves to verified entries
  only; experimental ones must be named explicitly.

### API

- `buildPrompt()` returns `{ url, truncated, droppedChars, autoSubmit, … }`.
  Truncation is never silent.
- `createRegistry()` returns an isolated registry. `addService()` mutated
  module-level state shared across requests, which leaked between tenants on
  a server.
- `createAiPrompts()` defaults to a short curated set rather than everything.
- Removed `suggestService()`. Its heuristics were arbitrary — any content
  containing a question mark routed to Perplexity.
- `CreatePromptOptions.model` is gone; Claude and Gemini never supported it.
- The 1.x `ServiceConfig` shape is still accepted by `addService()`.

### React

- `AiButton` / `AiButtonBar` are replaced by `AskAI` (a split button) and
  `AskAILink` (a plain anchor).
- Navigation uses real anchors instead of `window.open`, so middle-click,
  Cmd-click and "copy link address" work.
- `'use client'` now survives bundling. The 1.x React entry was silently
  server-only and threw on the first hook under the Next.js App Router.
- Styles moved to `@raptrx/askai/styles.css`. Inline style objects could not
  express `:focus-visible`, `:active`, `prefers-reduced-motion`,
  `forced-colors` or dark mode, none of which 1.x had.
- Vendor logos removed. Seven of the ten in 1.x were fabricated, including a
  garbled Claude mark; shipping corrected ones would push brand-usage
  exposure onto every consumer. Supply your own via `icons`.

### Packaging

- Added the `./react` and `./styles.css` export conditions. `dist/react.*`
  was built but unreachable in 1.x.
- `react` is an optional peer dependency.

## 1.4.0 and earlier

See git history.
