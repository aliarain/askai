/**
 * The service registry: the single source of truth for every AI destination.
 *
 * Every entry here was verified against shipping implementations and vendor
 * documentation on the date in `verifiedOn`. Deep-link parameters are not a
 * public API for any of these vendors — they change without notice — so each
 * entry carries the evidence that justified it and a tier saying how much to
 * trust it.
 *
 * Adding a service means adding one entry here and one SVG in `src/logos`.
 * Nothing downstream is hand-maintained: the union type, the CLI's prompt list
 * and the generated component template all derive from this file.
 */

/**
 * How much to trust a service's parameters.
 *
 * - `verified`     Corroborated by vendor docs or two independent shipping
 *                  implementations. Included in `'all'`.
 * - `experimental` Parameters believed correct from a single source. Excluded
 *                  from `'all'`; opt in by naming the service explicitly.
 * - `deprecated`   The vendor removed prefill, or never supported it. Kept so
 *                  consumers get a clear error rather than a silently empty
 *                  tab. Never included in `'all'`.
 */
export type ServiceTier = 'verified' | 'experimental' | 'deprecated';

export interface ServiceDefinition {
  /** Stable identifier used in the public API. */
  id: string;
  /** Human-readable product name, as the vendor writes it. */
  name: string;
  /** The company behind the product. */
  vendor: string;
  /** Base URL with no query string. */
  url: string;
  /** Query parameter that carries the prompt. */
  param: string;
  /** Static parameters the service requires alongside the prompt. */
  extraParams?: Record<string, string>;
  /**
   * Maximum prompt characters the service accepts.
   *
   * Where the vendor documents a limit we use it. Where none is documented we
   * use a conservative value rather than an optimistic one: overshooting
   * produces a request the service rejects outright, which is a worse failure
   * than sending slightly less than we could have.
   */
  maxLength: number;
  /**
   * Whether the service runs the prompt on arrival, or merely fills the
   * composer and waits for the user to press Enter.
   *
   * Historically every documented change to these deep links has removed
   * auto-submit, never prefill — a link on a third-party page must not make a
   * logged-in assistant execute a prompt. Treat `true` as perishable and never
   * build copy that promises one-click execution.
   */
  autoSubmit: boolean;
  /** Vendor brand color. Only rendered when the consumer opts into branding. */
  color: string;
  tier: ServiceTier;
  /**
   * Where `maxLength` came from.
   *
   * - `documented` the vendor states it
   * - `measured`   observed empirically or read out of their source
   * - `assumed`    no evidence; a conservative floor (the default when absent)
   *
   * Recorded separately from the parameter's own tier, because a service can
   * have a well-corroborated parameter and no published cap at all.
   */
  capSource?: 'documented' | 'measured' | 'assumed';
  /** ISO date these parameters were last checked. */
  verifiedOn: string;
  /** Why we believe the parameters are correct. */
  source?: string;
  /** Anything a consumer should know before enabling this service. */
  note?: string;
}

const VERIFIED_ON = '2026-08-29';

const RAW_DEFINITIONS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    url: 'https://chatgpt.com/',
    param: 'prompt',
    maxLength: 16000,
    autoSubmit: false,
    color: '#10a37f',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'fumadocs#3365',
    note:
      "Use `prompt`, not `q`. ChatGPT's `?q=` only reaches the composer via an " +
      'internal redirect that is itself the auto-submit-denied fallback path, so ' +
      'relying on it is fragile. Do not add `hints=search`: it has been reported ' +
      'to swallow the prefilled text and toggle web search instead.',
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    url: 'https://claude.ai/new',
    param: 'q',
    maxLength: 14000,
    capSource: 'documented',
    autoSubmit: false,
    color: '#cc9b7a',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'Anthropic help centre, updated 2026-06-30',
    note:
      'The only vendor-documented length cap of any service here: prompt text is ' +
      'truncated to roughly 14,000 characters.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    vendor: 'Perplexity',
    url: 'https://www.perplexity.ai/search/new',
    param: 'q',
    maxLength: 12000,
    autoSubmit: true,
    color: '#20b2aa',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Note the `/new` segment; `/search?q=` alone does not reliably start a query.',
  },
  {
    id: 'grok',
    name: 'Grok',
    vendor: 'xAI',
    url: 'https://grok.com/',
    param: 'q',
    maxLength: 7500,
    capSource: 'measured',
    autoSubmit: true,
    color: '#000000',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Cap measured empirically rather than documented.',
  },
  {
    id: 'kagi',
    name: 'Kagi Assistant',
    vendor: 'Kagi',
    url: 'https://kagi.com/assistant',
    param: 'q',
    maxLength: 8000,
    autoSubmit: true,
    color: '#ffb319',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'Kagi documentation',
    note: 'Kagi documents `qvalue` as the fill-without-submitting variant of `q`.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    param: 'q',
    maxLength: 12000,
    autoSubmit: false,
    color: '#4d6bfe',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'mistral',
    name: 'Le Chat',
    vendor: 'Mistral',
    url: 'https://chat.mistral.ai/chat',
    param: 'q',
    maxLength: 13350,
    capSource: 'measured',
    autoSubmit: false,
    color: '#ff7000',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Auto-submit behaviour unconfirmed, so we assume it does not.',
  },
  {
    id: 't3chat',
    name: 'T3 Chat',
    vendor: 'T3 Tools',
    url: 'https://t3.chat/new',
    param: 'q',
    maxLength: 12000,
    autoSubmit: true,
    color: '#ca0277',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'huggingchat',
    name: 'HuggingChat',
    vendor: 'Hugging Face',
    url: 'https://huggingface.co/chat',
    param: 'q',
    maxLength: 10000,
    capSource: 'documented',
    autoSubmit: true,
    color: '#ff9d00',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'chat-ui source',
    note:
      'Documented 10,000-character cap, above which the prompt is dropped entirely ' +
      'rather than truncated. The `prompt` parameter fills without submitting.',
  },
  {
    id: 'duckai',
    name: 'Duck.ai',
    vendor: 'DuckDuckGo',
    url: 'https://duck.ai/',
    param: 'q',
    extraParams: { bang: 'true', prompt: '1' },
    maxLength: 11000,
    capSource: 'measured',
    autoSubmit: true,
    color: '#de5833',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Submission is driven by `prompt=1`; without it the composer is only filled.',
  },
  {
    id: 'zai',
    name: 'Z.ai',
    vendor: 'Zhipu AI',
    url: 'https://chat.z.ai/',
    param: 'q',
    maxLength: 12000,
    autoSubmit: true,
    color: '#3b82f6',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Submits on arrival with no opt-out.',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    vendor: 'Moonshot AI',
    url: 'https://kimi.com/',
    param: 'prefill_prompt',
    maxLength: 12000,
    autoSubmit: false,
    color: '#1a1a1a',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Auto-submit is opt-in via `send_immediately=true`, which we deliberately omit.',
  },
  {
    id: 'qwen',
    name: 'Qwen Chat',
    vendor: 'Alibaba',
    url: 'https://chat.qwen.ai/',
    param: 'text',
    maxLength: 12000,
    autoSubmit: false,
    color: '#615ced',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere',
    url: 'https://cursor.com/link/prompt',
    param: 'text',
    maxLength: 8000,
    capSource: 'documented',
    autoSubmit: false,
    color: '#000000',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    note: 'Hands off to the desktop editor rather than a web chat. Explicitly never submits.',
  },

  {
    id: 'aistudio',
    name: 'Google AI Studio',
    vendor: 'Google',
    url: 'https://aistudio.google.com/prompts/new_chat',
    param: 'prompt',
    maxLength: 12000,
    capSource: 'assumed',
    autoSubmit: false,
    color: '#4285f4',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'Google DeepMind DevRel announcement 2025-11-04; Mintlify contextual menu',
    note:
      'Uses `prompt`, not `q`. Announced by Google DevRel in November 2025 but never ' +
      'formally documented, so this is the thinnest evidence of any verified entry. ' +
      'Fills the composer only — auto-submit remains an open feature request. Not to ' +
      'be confused with the Build surface at /apps, which takes its own parameters.',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    vendor: 'GitHub',
    url: 'https://github.com/copilot',
    param: 'prompt',
    maxLength: 12000,
    capSource: 'assumed',
    autoSubmit: false,
    color: '#0078d4',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: "github/docs production source, four call sites plus a test; GitHub changelog 2025-12-17",
    note:
      'Uses `prompt`; `q` does not work — a widely-cited community thread concluding ' +
      'that prefill is impossible had used `q`. Distinct from Microsoft Copilot, which ' +
      'removed prefill entirely. Auto-submit is unconfirmed, so we assume it does not.',
  },
  {
    id: 'v0',
    name: 'v0',
    vendor: 'Vercel',
    url: 'https://v0.app',
    param: 'q',
    maxLength: 12000,
    capSource: 'assumed',
    autoSubmit: true,
    color: '#000000',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'vercel/ai-elements, Vercel’s own source; Vercel Community thread 24457',
    note:
      'Submits on arrival with no opt-out. v0.dev redirects to v0.app preserving the ' +
      'query string, so either host works; we use the canonical one.',
  },
  {
    id: 'scira',
    name: 'Scira',
    vendor: 'Scira',
    url: 'https://scira.ai/',
    param: 'q',
    maxLength: 12000,
    capSource: 'assumed',
    autoSubmit: true,
    color: '#0f172a',
    tier: 'verified',
    verifiedOn: VERIFIED_ON,
    source: 'zaidmukaddam/scira source and README',
    note:
      'Submits on arrival — confirmed by reading the vendor source, not inferred. ' +
      '`query` is an equivalent alias for `q`.',
  },

  // ---------------------------------------------------------------------------
  // Deprecated: retained so that consumers upgrading from an earlier version get
  // an explicit error naming the reason, instead of a button that opens an empty
  // tab. Never returned by `'all'`.
  // ---------------------------------------------------------------------------
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    url: 'https://gemini.google.com/app',
    param: 'q',
    maxLength: 0,
    autoSubmit: false,
    color: '#8e44ad',
    tier: 'deprecated',
    verifiedOn: VERIFIED_ON,
    note:
      'The Gemini web app has never supported prompt prefill via URL. Any `?q=` ' +
      'link opens an empty chat. Use `aistudio` to reach a Google model.',
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    vendor: 'Microsoft',
    url: 'https://copilot.microsoft.com/',
    param: 'q',
    maxLength: 0,
    autoSubmit: false,
    color: '#0078d4',
    tier: 'deprecated',
    verifiedOn: VERIFIED_ON,
    note:
      'Prefill was removed in late 2025 following a prompt-injection vulnerability. ' +
      'Use `github-copilot` for the GitHub product, which is unrelated.',
  },
] as const satisfies readonly ServiceDefinition[];

/**
 * Every known service id, derived from the data above rather than restated.
 * Adding an entry widens this union automatically, so the type and the registry
 * cannot drift apart.
 */
export type KnownServiceId = (typeof RAW_DEFINITIONS)[number]['id'];

/**
 * The registry, widened to the shared interface.
 *
 * `RAW_DEFINITIONS` is `as const` purely so the ids survive as literals for
 * {@link KnownServiceId}. Consumers want the uniform shape, where optional
 * fields exist on every entry.
 */
export const SERVICE_DEFINITIONS: readonly ServiceDefinition[] = RAW_DEFINITIONS;

/** Service ids included when a consumer asks for `'all'`. */
export const VERIFIED_SERVICE_IDS: readonly KnownServiceId[] = RAW_DEFINITIONS.filter(
  (s) => s.tier === 'verified'
).map((s) => s.id);

/**
 * A short, opinionated default. A menu of twenty destinations is worse than a
 * menu of five; breadth belongs in the registry, not in the default UI.
 */
export const DEFAULT_SERVICE_IDS: readonly KnownServiceId[] = [
  'chatgpt',
  'claude',
  'perplexity',
  'grok',
];
