import type {
  AiService,
  CreatePromptOptions,
  PromptContent,
  PromptResult,
} from './types';
import type { ServiceDefinition } from './registry';
import { getService, VERIFIED_SERVICE_IDS, DEFAULT_SERVICE_IDS } from './services';
import { DEFAULT_MAX_ENCODED } from './registry';

/**
 * Heuristic: does this look like source code rather than prose?
 *
 * Deliberately conservative. A false positive wraps someone's paragraph in a
 * code fence, which is ugly but harmless; a false negative just means the model
 * sees unfenced code, which it handles fine. Neither is worth an elaborate
 * detector, so this only fires on signals that prose essentially never emits.
 */
export const CODE_SIGNALS: readonly RegExp[] = [
  // Statements that open a line in most languages.
  /^\s*(import|export|const|let|var|function|class|interface|type|def|from|package|using|fn|impl)\s/m,
  // A closing paren or brace followed by an arrow, allowing the space that
  // real code always has. The original pattern required them to be adjacent,
  // which no formatter produces, so it never matched anything.
  /[)\]}]\s*=>/,
  // Braces that open a block at end of line.
  /\{\s*$/m,
  // Python's entry-point idiom.
  /^\s*if\s+__name__\s*==/m,
  // A tag that opens at the start of a token, not a stray less-than.
  /<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?\/?>/,
  // Indented continuation lines, the shape of a function body.
  /^(\s{2,}|\t)\S.*\n^(\s{2,}|\t)\S/m,
];

export function looksLikeCode(content: string): boolean {
  return CODE_SIGNALS.some((re) => re.test(content));
}

function resolveFormat(
  content: string,
  format: CreatePromptOptions['format'],
  hasLanguageHint: boolean
): 'text' | 'code' {
  if (format === 'code') return 'code';
  if (format === 'text' || format === 'markdown') return 'text';
  // Naming a language is an explicit statement that the content is code, and it
  // beats the heuristic — a one-line snippet like `print(1)` carries none of the
  // signals below but is still code.
  if (hasLanguageHint) return 'code';
  return looksLikeCode(content) ? 'code' : 'text';
}

/** Normalize any accepted content shape into a string plus a language hint. */
function normalizeContent(content: PromptContent): { text: string; language?: string } {
  if (typeof content === 'string') return { text: content };
  if (
    content !== null &&
    typeof content === 'object' &&
    'text' in content &&
    typeof (content as { text: unknown }).text === 'string'
  ) {
    const c = content as { text: string; language?: string };
    return { text: c.text, language: c.language };
  }
  return { text: JSON.stringify(content, null, 2), language: 'json' };
}

function fence(text: string, language = ''): string {
  // Use a fence longer than any run of backticks inside the content, so code
  // containing a markdown example does not terminate its own block early.
  const longest = (text.match(/`+/g) ?? []).reduce((n, m) => Math.max(n, m.length), 0);
  const bar = '`'.repeat(Math.max(3, longest + 1));
  return `${bar}${language}\n${text}\n${bar}`;
}

function assertUsable(service: AiService, def: ServiceDefinition | undefined): ServiceDefinition {
  if (!def) {
    throw new Error(
      `Unknown AI service: "${service}". Known ids: ${VERIFIED_SERVICE_IDS.join(', ')}. ` +
        `Register a custom destination with addService().`
    );
  }
  if (def.tier === 'deprecated') {
    throw new Error(
      `"${service}" no longer supports prompt prefill and would open an empty chat. ` +
        (def.note ?? '')
    );
  }
  return def;
}

/**
 * Assemble the prompt and the deep link for one destination.
 *
 * Unlike {@link createAiPrompt} this reports whether the content had to be cut
 * and whether the destination will actually run the prompt, so callers can
 * label the control honestly.
 */
export function buildPrompt(
  goal: string,
  content: PromptContent,
  service: AiService,
  options: CreatePromptOptions = {}
): PromptResult {
  const def = assertUsable(service, getService(service));
  const { text, language } = normalizeContent(content);
  const lang = options.language ?? language ?? '';
  const format = resolveFormat(text, options.format, lang !== '');

  // Reserve room for the goal, the blank line between it and the content, and
  // the fence markers, so the budget below applies to the content alone.
  const wrap = (body: string) =>
    `${goal}\n\n${format === 'code' ? fence(body, lang) : body}`;

  // Two independent ceilings, and the prompt must clear both.
  //
  //   maxLength   what the page will accept once the request arrives
  //   maxEncoded  what the edge will accept at all
  //
  // The second is the one that usually bites: percent-encoding inflates real
  // prose by 1.2–3x, so a prompt comfortably inside a character budget can
  // still be refused with a 414 before any application code runs.
  const maxEncoded = def.maxEncoded ?? DEFAULT_MAX_ENCODED;
  const fits = (body: string) => {
    const prompt = wrap(body);
    return prompt.length <= def.maxLength && encodeURIComponent(prompt).length <= maxEncoded;
  };

  const full = wrap(text);
  let body = text;
  let truncated = false;
  let droppedChars = 0;

  if (!fits(text)) {
    if (options.onOverflow === 'error') {
      const encoded = encodeURIComponent(full).length;
      throw new Error(
        `Prompt is ${full.length} characters (${encoded} encoded) but ${def.name} ` +
          `accepts ${def.maxLength} characters within ${maxEncoded} encoded bytes. ` +
          `Shorten the content or pass onOverflow: 'truncate'.`
      );
    }

    // Binary-search the longest prefix that clears both ceilings. A ratio
    // estimate would be wrong for mixed content, where a run of newlines
    // encodes at 3x and a run of letters at 1x.
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(text.slice(0, mid) + '…')) lo = mid;
      else hi = mid - 1;
    }

    body = text.slice(0, lo) + '…';
    droppedChars = text.length - lo;
    truncated = true;
  }

  const prompt = wrap(body);
  const url = new URL(def.url);
  for (const [k, v] of Object.entries(def.extraParams ?? {})) {
    url.searchParams.set(k, v);
  }
  for (const [k, v] of Object.entries(options.params ?? {})) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set(def.param, prompt);

  return {
    service: def.id,
    name: def.name,
    url: url.toString(),
    color: def.color,
    autoSubmit: def.autoSubmit,
    truncated,
    droppedChars,
  };
}

/**
 * Build a deep link for one destination.
 *
 * @example
 * const url = createAiPrompt('Explain this', 'const x = 1;', 'chatgpt');
 */
export function createAiPrompt(
  goal: string,
  content: PromptContent,
  service: AiService,
  options?: CreatePromptOptions
): string {
  return buildPrompt(goal, content, service, options).url;
}

/**
 * Build deep links for several destinations at once.
 *
 * `'all'` resolves to the verified tier only — experimental and deprecated
 * services must be named explicitly, so a caller never ships a broken button by
 * accident.
 */
export function createAiPrompts(
  goal: string,
  content: PromptContent,
  services: AiService[] | 'all' | 'default' = 'default',
  options?: CreatePromptOptions
): PromptResult[] {
  const list =
    services === 'all'
      ? [...VERIFIED_SERVICE_IDS]
      : services === 'default'
        ? [...DEFAULT_SERVICE_IDS]
        : services;
  return list.map((service) => buildPrompt(goal, content, service, options));
}

/** Does `url` point at the origin `service` is registered under? */
export function validateUrl(service: AiService, url: string): boolean {
  const def = getService(service);
  if (!def) return false;
  try {
    return new URL(url).origin === new URL(def.url).origin;
  } catch {
    return false;
  }
}

/**
 * Open a destination in a new tab.
 *
 * Prefer rendering an `<a href>` — a real link supports middle-click, Cmd-click
 * and "copy link address", and is not subject to popup blocking. This exists
 * for imperative call sites that have no element to hang a link on.
 */
export function openAiPrompt(
  goal: string,
  content: PromptContent,
  service: AiService,
  options?: CreatePromptOptions
): void {
  const { url } = buildPrompt(goal, content, service, options);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
