'use client';

import * as React from 'react';
import {
  buildPrompt,
  VERIFIED_SERVICE_IDS,
  DEFAULT_SERVICE_IDS,
  type AiService,
  type CreatePromptOptions,
  type PromptContent,
  type PromptResult,
} from '../core';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalIcon,
  getIcon,
  type ServiceIcons,
} from './icons';

export interface AskAIProps {
  /** What you want the AI to do, e.g. "Explain this function". */
  goal: string;
  /** The content to send. */
  content: PromptContent;
  /**
   * Destinations to offer.
   *
   * `'default'` (the default) is a short curated set. `'all'` is every verified
   * destination. Experimental ones must be named explicitly.
   */
  services?: AiService[] | 'all' | 'default';
  /** Label on the primary half. */
  label?: string;
  /** Custom icons per service. None ship by default; see `icons.tsx`. */
  icons?: ServiceIcons;
  /** Force a colour scheme instead of following the system. */
  theme?: 'light' | 'dark' | 'auto';
  /** Which edge the menu aligns to. */
  align?: 'start' | 'end';
  /** Prompt-building options, forwarded to the core builder. */
  options?: CreatePromptOptions;
  /** Called after the prompt is copied. */
  onCopy?: (prompt: string) => void;
  /** Called when a destination is chosen, before the tab opens. */
  onOpen?: (result: PromptResult) => void;
  className?: string;
  style?: React.CSSProperties;
}

function resolveServices(services: AskAIProps['services']): AiService[] {
  if (services === 'all') return [...VERIFIED_SERVICE_IDS];
  if (services === undefined || services === 'default') return [...DEFAULT_SERVICE_IDS];
  return services;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API rejects without a transient user activation, or when the
    // document is not focused. Fall through to the legacy path.
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * A split button: copy the prompt, or send it to an AI.
 *
 * The primary half copies, because copying has no length ceiling and works
 * everywhere. The menu offers deep links, which are faster but bounded by each
 * destination's URL limit.
 *
 * Menu entries are real anchors, so middle-click, Cmd-click and "copy link
 * address" all behave. Nothing here promises one-click execution: most
 * destinations fill the composer and wait for the user to press Enter, and the
 * menu says so.
 */
export const AskAI: React.FC<AskAIProps> = ({
  goal,
  content,
  services,
  label = 'Copy prompt',
  icons,
  theme = 'auto',
  align = 'end',
  options,
  onCopy,
  onOpen,
  className,
  style,
}) => {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = React.useId();

  const ids = React.useMemo(() => resolveServices(services), [services]);

  // The plain prompt, used by the copy action. Built against the destination
  // with the largest budget so copying is never truncated on a menu's behalf.
  const prompt = React.useMemo(() => {
    const { url } = buildPrompt(goal, content, ids[0] ?? 'chatgpt', options);
    const param = new URL(url).searchParams;
    return [...param.values()].reduce((a, b) => (b.length > a.length ? b : a), '');
  }, [goal, content, ids, options]);

  const results = React.useMemo<PromptResult[]>(() => {
    return ids.flatMap((id) => {
      try {
        return [buildPrompt(goal, content, id, options)];
      } catch {
        // A deprecated or unknown id should not take the whole control down.
        return [];
      }
    });
  }, [ids, goal, content, options]);

  // Reset the transient "Copied" affordance.
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Close on outside pointer press.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Move DOM focus to follow the active item.
  React.useEffect(() => {
    if (open && activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const handleCopy = React.useCallback(async () => {
    const ok = await copyText(prompt);
    if (ok) {
      setCopied(true);
      onCopy?.(prompt);
    }
  }, [prompt, onCopy]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(results.length - 1);
        break;
      case 'Tab':
        // Tab leaves the widget entirely, per the menu button pattern.
        close(false);
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(results.length - 1);
    }
  };

  const CopyGlyph = copied ? CheckIcon : CopyIcon;

  return (
    <div
      ref={rootRef}
      className={['askai', className].filter(Boolean).join(' ')}
      data-theme={theme === 'auto' ? undefined : theme}
      style={style}
    >
      <div className="askai-group">
        <button
          type="button"
          className="askai-btn askai-btn--primary"
          onClick={handleCopy}
        >
          <CopyGlyph className="askai-icon" />
          {/* The label changes as well as the icon, so the state is never
              carried by the glyph alone. */}
          <span>{copied ? 'Copied' : label}</span>
        </button>

        <div className="askai-divider" aria-hidden="true" />

        <button
          ref={triggerRef}
          type="button"
          className="askai-btn askai-btn--trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label="Send to an AI assistant"
          onClick={() => {
            setOpen((v) => !v);
            setActiveIndex(-1);
          }}
          onKeyDown={onTriggerKeyDown}
        >
          <ChevronDownIcon className="askai-icon askai-caret" />
        </button>
      </div>

      {open && (
        <ul
          id={menuId}
          role="menu"
          className="askai-menu"
          data-align={align}
          aria-label="AI destinations"
          onKeyDown={onMenuKeyDown}
        >
          {results.map((result, i) => {
            const Icon = getIcon(String(result.service), icons);
            return (
              <li key={String(result.service)} role="none">
                <a
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="menuitem"
                  className="askai-item"
                  data-active={activeIndex === i || undefined}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={activeIndex === i ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onOpen?.(result);
                    close(false);
                  }}
                >
                  <Icon className="askai-icon" />
                  <span className="askai-item-label">{result.name}</span>
                  <span className="askai-item-hint">
                    {result.autoSubmit ? 'Runs' : 'Ready'}
                  </span>
                  {result.truncated && (
                    <span className="askai-sr">
                      {`Content shortened by ${result.droppedChars} characters to fit ${result.name}. Use Copy prompt to send all of it.`}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
          <li role="none">
            <hr className="askai-sep" />
          </li>
          <li role="none" className="askai-section">
            <ExternalIcon className="askai-icon" style={{ verticalAlign: '-2px' }} />{' '}
            Opens in a new tab. &ldquo;Ready&rdquo; means press Enter to send.
          </li>
        </ul>
      )}
    </div>
  );
};

AskAI.displayName = 'AskAI';
