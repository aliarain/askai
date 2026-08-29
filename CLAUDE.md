# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # rollup -c -> dist/ (5 outputs: index.mjs/js, react.mjs/js, cli.js, + .d.ts)
npm run dev            # rollup watch
npm test               # vitest run
npm run test:watch
npx tsc --noEmit       # typecheck (root tsconfig.json sets noEmit; build uses tsconfig.build.json)

npm test -- src/core/builder.test.ts        # single file
npm test -- -t "should create a Claude URL" # single test by name
```

There is no lint script and no ESLint config, despite `eslint` being a devDependency.

To exercise the CLI end-to-end, build first and run `node dist/cli.js init` from a scratch directory — it writes files into `process.cwd()`.

## Architecture

This package ships **two independent products** that solve the same problem in different ways. Changes to AI-service behavior usually need to be made in both.

### 1. The published runtime library (`src/core`, `src/components`)

Consumed as a normal npm import. Entry points are `src/index.ts` (core only) and `src/react.ts` (React components), bundled by Rollup into ESM + CJS + `.d.ts`.

- `src/core/services.ts` — the service registry. A frozen `defaultServices` map plus a mutable `services` copy, mutated through `addService`/`removeService`/`resetServices`. Because the registry is module-level mutable state, tests must call `resetServices()` in `beforeEach` (see `services.test.ts`).
- `src/core/builder.ts` — prompt string assembly and URL construction. `createAiPrompt` composes `goal + "\n\n" + content`, auto-detects code via regex heuristics (`isCodeContent`) to wrap it in fences, truncates to the service's `maxLength`, then builds the URL according to the service's `method` (`query` | `hash` | `path`).
- `src/components/` — `AiButton` / `AiButtonBar`, plus an inline-SVG icon registry (`icons.tsx`) and an inline-style theme map (`styles.ts`). No CSS files; everything is inline styles so the package has zero runtime deps.

### 2. The shadcn-style CLI generator (`src/cli`)

`npx @raptrx/askai init` copies component source *into the user's project* rather than installing a dependency. This is the direction the project is moving (see `agent.mdx`, which is the integration guide written for AI agents consuming this package).

- `src/cli/templates.ts` — the generated files (`core.tsx`, `AskAiButton.tsx`, `AskAiButtonBar.tsx`) exist as **template literal strings**. Editing them means editing escaped TypeScript inside a backtick string: `\`` for backticks and `\\\${` for interpolations that must survive into the output file.
- `src/cli/index.ts` — detects the framework from the consumer's `package.json` (Next.js / Vite / Remix), prompts for goal + services + path, then **prunes the template with regex**: for every unselected service it deletes that key's object literal from `coreTemplate`, and it string-replaces `'chatgpt'` / `'Explain this code'` / the default services array to inject the user's answers. Renaming any of those literals in the templates silently breaks injection. Finally it writes `.askaiconfig.json` to the consumer's cwd.

### Service definitions live in three places

Adding or changing an AI service requires touching all of these, and they can drift:

1. `src/core/services.ts` — `defaultServices` (baseUrl, promptParam, maxLength, color) and the `DEFAULT_SERVICES` array used for `'all'`.
2. `src/core/types.ts` — the `AiService` union.
3. `src/cli/templates.ts` — a completely separate `services` record inside `coreTemplate`, with its own `buildUrl` closures and its own inlined SVGs; plus the `AI_SERVICES` prompt list in `src/cli/index.ts`.

Note the two implementations already disagree: the library truncates at each service's `maxLength` (16k–100k), while the generated template truncates everything at 2000 chars to avoid 414 errors. The generated template also points ChatGPT at `chat.openai.com` where the library uses `chatgpt.com`.

## Known issues worth knowing before you touch things

- **`coreTemplate` in `src/cli/templates.ts` is corrupted.** Around line 58 the Grok icon's SVG path is truncated mid-string and the entire `services` record restarts (`...00-1.829-1Record<ServiceId, AiService> = {`), so the `core.tsx` the CLI writes into a user's project will not compile. Fix this before shipping any CLI change.
- **`package.json` has no `./react` export.** Rollup builds `dist/react.mjs`/`dist/react.js`/`dist/react.d.ts`, but `exports` only declares `"."`, so `@raptrx/askai/react` is unreachable for consumers.
- **README.md describes a CLI that doesn't exist.** It documents `add button` / `add link` / `add dropdown`, an `askai.json` config, and `AskAILink`/`AskAIDropdown` components. The actual CLI supports only `init`, `help`, and `--version`, and writes `.askaiconfig.json`.
- **The version string is duplicated** in three spots in `src/cli/index.ts` (the `LOGO` banner, the `--version` output, and the `version` field written into `.askaiconfig.json`, currently stale at `1.2.0`) plus `package.json`.
- **`src/logos/*.svg` are unreferenced** by any source file — icons are inlined in `icons.tsx` and `templates.ts` instead.
