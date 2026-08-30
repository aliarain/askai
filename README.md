# askai

> Send anything on your page to ChatGPT, Claude, Perplexity or Grok — with deep links that are actually verified.

[![npm](https://img.shields.io/npm/v/@raptrx/askai)](https://www.npmjs.com/package/@raptrx/askai)
[![license](https://img.shields.io/npm/l/@raptrx/askai)](./LICENSE)

```bash
npm i @raptrx/askai
```

```tsx
import { AskAI } from '@raptrx/askai/react';
import '@raptrx/askai/styles.css';

<AskAI goal="Explain this function" content={code} />
```

That renders a split button: **Copy prompt** on the left, a menu of AI destinations behind the caret.

---

## Why this exists

Every AI vendor accepts a prompt in a URL. None of them document it, none of them promise it will keep working, and they change it without notice. Most published "Ask AI" buttons are quietly broken as a result.

At the time of writing, six of the ten destinations shipped by this package's own 1.x were wrong:

| Destination | What was wrong |
|---|---|
| Gemini | Has never supported URL prefill. The button always opened an empty chat. |
| Microsoft Copilot | Prefill removed in late 2025 after a prompt-injection CVE. |
| ChatGPT | `?q=` only reaches the composer via a fallback redirect. `?prompt=` is stable. |
| Google AI Studio | Uses `?prompt=`, not `?q=`. |
| Perplexity | Needs `/search/new`, not `/search`. |
| Claude | Real cap is ~14,000 characters, not the 100,000 we claimed. |

So this package treats deep links as what they are — undocumented and perishable — and makes that safe:

- **Every destination carries a tier.** `verified` ships by default. `experimental` must be named explicitly. `deprecated` throws with the reason instead of opening an empty tab.
- **Every entry records when it was checked** and what the evidence was.
- **Nothing promises one-click.** Most destinations fill the composer and wait for Enter. The menu says which do which.

## Copy is the primary action

Deep links are bounded by URL length. Claude cuts at ~14,000 characters, Grok at ~7,500, Cursor at 8,000. Sending an AI half a function and letting it answer confidently about the wrong code is worse than not sending anything.

So the primary button copies, which has no ceiling. Deep links are the convenience path, and when content has to be shortened to fit one, the result says so rather than hiding it:

```tsx
const result = buildPrompt('Review this', longFile, 'claude');
result.truncated;     // true
result.droppedChars;  // 36114
result.autoSubmit;    // false — Claude fills the composer, user presses Enter
```

## Components

### `<AskAI>` — the split button

```tsx
<AskAI
  goal="Explain this function"
  content={code}
  services={['chatgpt', 'claude', 'perplexity']}
/>
```

| Prop | Default | |
|---|---|---|
| `goal` | — | What you want the AI to do |
| `content` | — | String, `{ text, language }`, or any object (serialized as JSON) |
| `services` | `'default'` | Array of ids, `'default'`, or `'all'` (verified tier only) |
| `label` | `'Copy prompt'` | Primary button label |
| `theme` | `'auto'` | `'light'`, `'dark'`, or follow the system |
| `align` | `'end'` | Menu alignment |
| `icons` | — | Your own icon per service |
| `onCopy` / `onOpen` | — | Analytics hooks |

Full menu-button keyboard support: arrows, Home/End, Escape restores focus to the trigger, Tab exits.

### `<AskAILink>` — one destination, no JavaScript

```tsx
<AskAILink service="claude" goal="Review this" content={code}>
  Ask Claude
</AskAILink>
```

Renders a plain `<a>`. No state, no effects, no client boundary — it works in a server component, and middle-click, Cmd-click and "copy link address" all behave.

## Core (no React)

```ts
import { buildPrompt, createAiPrompt, createAiPrompts } from '@raptrx/askai';

createAiPrompt('Explain this', code, 'chatgpt');   // → url string
buildPrompt('Explain this', code, 'claude');       // → PromptResult with truncation info
createAiPrompts('Explain this', code, 'all');      // → every verified destination
```

## Destinations

Run `npx @raptrx/askai list` to see the live table with parameters, caps and tiers.

**Verified** — ChatGPT, Claude, Perplexity, Grok, Kagi Assistant, DeepSeek, Le Chat, T3 Chat, HuggingChat, Duck.ai, Z.ai, Kimi, Qwen Chat, Cursor

**Experimental** — Google AI Studio, GitHub Copilot, v0, Scira

**Deprecated** — Gemini, Microsoft Copilot

## Bring your own

Most companies with an AI assistant have their own. That is a first-class case, not an afterthought:

```ts
import { createRegistry } from '@raptrx/askai';

const registry = createRegistry();
registry.add('acme', {
  name: 'Acme AI',
  url: 'https://ai.acme.internal/chat',
  param: 'prompt',
});
```

Use `createRegistry()` rather than the global `addService()` anywhere requests share a process — the global registry is shared across every request, so one tenant's destination would leak into another's.

## Logos

Destinations use a neutral glyph by default. Brand marks are one import away:

```tsx
import { logos } from '@raptrx/askai/logos';

<AskAI icons={logos} goal="Explain this" content={code} />
```

Seven vendors ship their real mark — OpenAI, Claude, Grok, Perplexity, Mistral, Qwen and Z.ai — reproduced exactly as supplied, with their own colours. The rest get a monogram in their brand colour, because an approximated logo is worse than none: it is visibly wrong, and an altered mark is the thing vendors most clearly prohibit. Nothing here is redrawn or recoloured.

You can also supply your own per service:

```tsx
<AskAI icons={{ ...logos, chatgpt: MyOwnMark }} … />
```

They sit behind a subpath rather than the package root on purpose. Using a third party's trademark in your product is your decision, not a default you inherit — most vendors require the mark be unaltered and several require written permission, so check their brand guidelines before shipping.

## CLI — own the code instead

Prefer copying the components into your project, shadcn-style?

```bash
npx @raptrx/askai init
```

Generates `core.ts`, `AskAiButton.tsx` and `AskAiLink.tsx` containing only the destinations you pick, with the verified parameters baked in. The generated output is compiled by this repo's test suite on every commit.

## Docs

[docs.aliarain.com/askai](https://docs.aliarain.com/askai)

## License

MIT © [Ali Arain](https://aliarain.com)
