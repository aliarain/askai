# Integrating askai — a guide for coding agents

You are reading this because someone asked you to add an "Ask AI" button to their project. This file tells you how to do it correctly and what to avoid.

## Pick a path

**Installing the package** is right by default. One dependency, updates arrive when parameters change.

```bash
npm i @raptrx/askai
```

**Generating the code** suits projects that vendor their UI (shadcn-style) or cannot take a dependency:

```bash
npx @raptrx/askai init
```

This is interactive — three prompts: default goal, destinations, output directory. If you cannot drive a TTY, install the package instead rather than hand-writing the files.

## The minimum correct integration

```tsx
import { AskAI } from '@raptrx/askai/react';
import '@raptrx/askai/styles.css';   // do not skip this

export function CodeBlock({ code }: { code: string }) {
  return (
    <div>
      <pre>{code}</pre>
      <AskAI goal="Explain this code" content={code} />
    </div>
  );
}
```

Two things matter most:

1. **`content` is the dynamic data.** It is the whole point. Pass the actual code, error, article or record the user is looking at — never a static string.
2. **Import the stylesheet once**, anywhere in the app. Without it the control renders unstyled.

## Choosing the component

| Situation | Use |
|---|---|
| Give the user a choice of AI | `<AskAI>` |
| One fixed destination | `<AskAILink>` |
| Server component, or no JS | `<AskAILink>` — it has no client boundary |
| No React at all | `buildPrompt()` from `@raptrx/askai` |

## Things that will make the integration wrong

**Do not promise one-click.** Label the control "Ask AI" or "Open in ChatGPT", never "Run in ChatGPT" or "Get an answer". Most destinations fill the composer and wait for the user to press Enter. `result.autoSubmit` tells you which do; the built-in menu already renders this correctly.

**Do not add Gemini or Microsoft Copilot.** Gemini has never supported URL prefill and Microsoft Copilot's was removed in 2025. Both are retained in the registry only so they throw a clear error. Asking for them will fail loudly, by design. If the user wants a Google model, use `aistudio`.

**Do not pass huge content and assume it arrives.** Destinations cap between 7,500 and 16,000 characters. For anything long, let the user copy instead — that is what the primary button is for. If you need to know, check `buildPrompt(...).truncated`.

**Logos are opt-in, not default.** Add them with `import { logos } from '@raptrx/askai/logos'` and pass `icons={logos}`. Never hand-draw a mark to fill a gap — the eleven destinations without a real logo intentionally use a monogram, and an approximated mark is both visibly wrong and the thing vendors most clearly prohibit.

**Do not hand-write the URLs.** `chatgpt.com/?q=` looks like it works and is the fragile path; `?prompt=` is the stable one. The registry exists precisely so nobody has to remember this.

## Common shapes

Error boundary:

```tsx
<AskAI
  goal="Help me fix this error"
  content={{ text: error.stack ?? error.message, language: 'text' }}
  services={['chatgpt', 'claude']}
/>
```

Docs page:

```tsx
<AskAI goal="Answer questions about this page" content={markdown} label="Copy page" />
```

Data table row:

```tsx
<AskAI goal="Summarise this record" content={row} />
```

Objects are serialized to fenced JSON automatically.

## Verifying your work

```bash
npx @raptrx/askai list   # every destination, its parameter, cap and tier
```

Then click the control and confirm the prompt lands in the destination's composer. If it opens empty, the parameter changed — open an issue at https://github.com/aliarain/askai rather than patching around it, so the fix reaches everyone.

## Reference

- Docs: https://docs.aliarain.com/askai
- Source: https://github.com/aliarain/askai
