import type { KnownServiceId, ServiceDefinition } from './registry';

export type { ServiceDefinition, ServiceTier, KnownServiceId } from './registry';

/**
 * An AI service identifier.
 *
 * The known ids are derived from the registry, so editors autocomplete them,
 * but any string is accepted so consumers can register their own destination —
 * an internal assistant, a self-hosted model — without patching this union.
 */
export type AiService = KnownServiceId | (string & {});

/**
 * Shape accepted when registering a custom service.
 *
 * `id`, `tier` and `verifiedOn` are supplied by the registry on your behalf,
 * and the remaining registry metadata is optional because a private assistant
 * has no vendor or brand color worth stating.
 */
export interface CustomServiceInput {
  name: string;
  url: string;
  param: string;
  extraParams?: Record<string, string>;
  maxLength?: number;
  autoSubmit?: boolean;
  color?: string;
  vendor?: string;
  note?: string;
}

/**
 * @deprecated Use {@link CustomServiceInput}. Retained so that code written
 * against 1.x keeps compiling; `baseUrl` maps to `url` and `promptParam` to
 * `param`.
 */
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  promptParam: string;
  params?: Record<string, string>;
  method?: 'query' | 'hash' | 'path';
  maxLength?: number;
  icon?: string;
  color?: string;
}

export interface CreatePromptOptions {
  /** Extra query parameters to append. */
  params?: Record<string, string>;
  /**
   * How to format `content` in the prompt body.
   *
   * Defaults to auto-detection: content that looks like source is fenced,
   * everything else is passed through unchanged.
   */
  format?: 'text' | 'code' | 'markdown' | 'auto';
  /** Language hint for the fence when `format` resolves to `code`. */
  language?: string;
  /**
   * What to do when the prompt exceeds the destination's length cap.
   *
   * - `truncate` (default) cut the content and mark the result truncated
   * - `error`             throw, so the caller decides
   *
   * There is deliberately no silent option. Sending an AI half a function and
   * letting it answer confidently about the wrong code is the worst outcome
   * available, so a truncated prompt is always reported back to the caller.
   */
  onOverflow?: 'truncate' | 'error';
}

/** The content to send. */
export type PromptContent =
  | string
  | { text: string; language?: string }
  | Record<string, unknown>;

export interface PromptResult {
  service: AiService;
  /** Display name of the destination. */
  name: string;
  /** The deep link. */
  url: string;
  /** Brand color, for consumers that opt into branded rendering. */
  color?: string;
  /**
   * Whether the destination runs the prompt on arrival or merely fills the
   * composer. Use it to write honest labels; never promise one-click.
   */
  autoSubmit: boolean;
  /** True when content was cut to fit the destination's cap. */
  truncated: boolean;
  /** Characters dropped, or 0. */
  droppedChars: number;
}

export type { ServiceDefinition as AiServiceDefinition };
