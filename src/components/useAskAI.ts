'use client';

import * as React from 'react';
import {
  buildPrompt,
  VERIFIED_SERVICE_IDS,
  DEFAULT_SERVICE_IDS,
  getService,
  type AiService,
  type CreatePromptOptions,
  type PromptContent,
  type PromptResult,
} from '../core';

export interface UseAskAIOptions {
  goal: string;
  content: PromptContent;
  services?: AiService[] | 'all' | 'default';
  options?: CreatePromptOptions;
  onCopy?: (prompt: string) => void;
  onOpen?: (result: PromptResult) => void;
  /** Milliseconds the copied state persists. */
  copyResetMs?: number;
}

export interface UseAskAIResult {
  /** One entry per destination, with url, truncation and autoSubmit. */
  destinations: PromptResult[];
  /** The assembled prompt, untruncated — what the copy action puts on the clipboard. */
  prompt: string;
  /** True for `copyResetMs` after a successful copy. */
  copied: boolean;
  /** Copy the prompt. Resolves false if the clipboard refused. */
  copy: () => Promise<boolean>;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  /** Index of the destination the keyboard is currently on, or -1. */
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  /** Close, optionally returning focus to the trigger. */
  close: (restoreFocus?: boolean) => void;

  /** Spread onto the element that wraps the whole control. */
  getRootProps: () => { ref: React.RefObject<HTMLDivElement>; };
  /** Spread onto your copy button. */
  getCopyButtonProps: () => React.ButtonHTMLAttributes<HTMLButtonElement>;
  /** Spread onto the element that opens the menu. */
  getTriggerProps: () => React.ButtonHTMLAttributes<HTMLButtonElement> & {
    ref: React.RefObject<HTMLButtonElement>;
  };
  /** Spread onto your menu container. */
  getMenuProps: () => React.HTMLAttributes<HTMLElement> & { id: string; role: string };
  /** Spread onto each destination. Anchors, so links behave like links. */
  getItemProps: (
    index: number
  ) => React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    ref: (el: HTMLAnchorElement | null) => void;
    key: string;
  };
}

function resolveServices(services: UseAskAIOptions['services']): AiService[] {
  if (services === 'all') return [...VERIFIED_SERVICE_IDS];
  if (services === undefined || services === 'default') return [...DEFAULT_SERVICE_IDS];
  return services;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Rejected without a transient user activation, or the document is not
    // focused. Fall through to the legacy path rather than failing silently.
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
 * The behaviour of the Ask AI control, with no markup and no styling.
 *
 * Use this when the shipped component cannot be bent far enough to match your
 * design system — you get the prompt assembly, the clipboard handling and the
 * full menu-button keyboard pattern, and you render whatever you like.
 *
 * @example
 * const ai = useAskAI({ goal: 'Explain this', content: code });
 *
 * <div {...ai.getRootProps()}>
 *   <MyButton {...ai.getCopyButtonProps()}>{ai.copied ? 'Copied' : 'Copy'}</MyButton>
 *   <MyButton {...ai.getTriggerProps()}>▾</MyButton>
 *   {ai.isOpen && (
 *     <MyMenu {...ai.getMenuProps()}>
 *       {ai.destinations.map((d, i) => (
 *         <MyItem {...ai.getItemProps(i)}>{d.name}</MyItem>
 *       ))}
 *     </MyMenu>
 *   )}
 * </div>
 */
export function useAskAI({
  goal,
  content,
  services,
  options,
  onCopy,
  onOpen,
  copyResetMs = 2000,
}: UseAskAIOptions): UseAskAIResult {
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = React.useId();

  const ids = React.useMemo(() => resolveServices(services), [services]);

  const destinations = React.useMemo<PromptResult[]>(
    () =>
      ids.flatMap((id) => {
        try {
          return [buildPrompt(goal, content, id, options)];
        } catch {
          // A deprecated or unknown id must not take the whole control down.
          return [];
        }
      }),
    [ids, goal, content, options]
  );

  /**
   * The prompt for the clipboard, built against whichever destination has the
   * largest budget so copying is never shortened on a menu item's behalf.
   */
  const prompt = React.useMemo(() => {
    const widest = ids.reduce<{ id: AiService; cap: number } | null>((best, id) => {
      const cap = getService(id)?.maxLength ?? 0;
      return !best || cap > best.cap ? { id, cap } : best;
    }, null);
    if (!widest) return '';
    try {
      const result = buildPrompt(goal, content, widest.id, {
        ...options,
        onOverflow: 'truncate',
      });
      const def = getService(widest.id)!;
      return new URL(result.url).searchParams.get(def.param) ?? '';
    } catch {
      return '';
    }
  }, [ids, goal, content, options]);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), copyResetMs);
    return () => clearTimeout(t);
  }, [copied, copyResetMs]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const close = React.useCallback((restoreFocus = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const copy = React.useCallback(async () => {
    const ok = await writeClipboard(prompt);
    if (ok) {
      setCopied(true);
      onCopy?.(prompt);
    }
    return ok;
  }, [prompt, onCopy]);

  const onMenuKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const n = destinations.length;
      if (!n) return;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % n);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + n) % n);
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(n - 1);
          break;
        case 'Tab':
          // Tab leaves the widget entirely, per the menu button pattern.
          close(false);
          break;
      }
    },
    [destinations.length, close]
  );

  const onTriggerKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(destinations.length - 1);
      }
    },
    [destinations.length]
  );

  return {
    destinations,
    prompt,
    copied,
    copy,
    isOpen,
    setOpen: setIsOpen,
    activeIndex,
    setActiveIndex,
    close,

    getRootProps: () => ({ ref: rootRef }),

    getCopyButtonProps: () => ({
      type: 'button',
      onClick: () => {
        void copy();
      },
    }),

    getTriggerProps: () => ({
      ref: triggerRef,
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? menuId : undefined,
      'aria-label': 'Send to an AI assistant',
      onClick: () => {
        setIsOpen((v) => !v);
        setActiveIndex(-1);
      },
      onKeyDown: onTriggerKeyDown,
    }),

    getMenuProps: () => ({
      id: menuId,
      role: 'menu',
      'aria-label': 'AI destinations',
      onKeyDown: onMenuKeyDown,
      // Hovering sets the active index, which also moves real DOM focus.
      // Without this, sliding the pointer off the menu leaves a row both
      // highlighted and focused with nothing pointing at it.
      onPointerLeave: () => setActiveIndex(-1),
    }),

    getItemProps: (index: number) => {
      const result = destinations[index];
      return {
        // Index-joined: a caller may legitimately pass the same destination
        // twice, and duplicate React keys silently drop rows.
        key: `${index}-${String(result?.service ?? 'unknown')}`,
        ref: (el: HTMLAnchorElement | null) => {
          itemRefs.current[index] = el;
        },
        role: 'menuitem',
        href: result?.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        tabIndex: activeIndex === index ? 0 : -1,
        onMouseEnter: () => setActiveIndex(index),
        onClick: () => {
          if (result) onOpen?.(result);
          close(false);
        },
      };
    },
  };
}
