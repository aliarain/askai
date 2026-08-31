import * as React from 'react';
import {
  buildPrompt,
  type AiService,
  type CreatePromptOptions,
  type PromptContent,
} from '../core';
import { getIcon, type ServiceIcons } from './icons';

/** Visually hidden without depending on the stylesheet. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

export interface AskAILinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'content'> {
  /** What you want the AI to do. */
  goal: string;
  /** The content to send. */
  content: PromptContent;
  /** Which destination to open. */
  service: AiService;
  /** Link text. Defaults to "Ask <service name>". */
  children?: React.ReactNode;
  /** Show a leading glyph. */
  showIcon?: boolean;
  /** Custom icons per service. */
  icons?: ServiceIcons;
  /** Force a colour scheme instead of following the system. */
  theme?: 'light' | 'dark' | 'auto';
  /** Drop the built-in classes, keeping behaviour and your own. */
  unstyled?: boolean;
  /** Per-part class names, merged after the built-in ones. */
  classNames?: { root?: string; icon?: string; label?: string };
  /** Prompt-building options. */
  options?: CreatePromptOptions;
}

/**
 * A single AI destination rendered as a plain anchor.
 *
 * There is no state and no effect here, so it renders identically on the server
 * and needs no `'use client'` boundary. Being a real link, it supports
 * middle-click, Cmd-click, "open in new tab" and "copy link address" — none of
 * which work when a button calls `window.open`.
 */
export const AskAILink = React.forwardRef<HTMLAnchorElement, AskAILinkProps>(
  function AskAILink(
    {
      goal,
      content,
      service,
      children,
      showIcon = true,
      icons,
      theme = 'auto',
      unstyled = false,
      classNames: cn = {},
      options,
      className,
      ...rest
    },
    ref
  ) {
    const result = buildPrompt(goal, content, service, options);
    const Icon = getIcon(String(service), icons, result.color);

    const cx = (builtIn: string, custom?: string) =>
      [unstyled ? undefined : builtIn, custom].filter(Boolean).join(' ') || undefined;

    return (
      <a
        ref={ref}
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        data-theme={theme === 'auto' ? undefined : theme}
        className={cx('askai askai-link', [cn.root, className].filter(Boolean).join(' '))}
        {...rest}
      >
        {showIcon && <Icon className={cx('askai-icon', cn.icon)} />}
        <span className={cn.label}>{children ?? `Ask ${result.name}`}</span>
        {result.truncated && (
          // Hidden by inline style too: `unstyled` drops the class, and a class
          // that is not there hides nothing.
          <span
            className={unstyled ? undefined : 'askai-sr'}
            style={unstyled ? SR_ONLY : undefined}
          >
            {`Shortened by ${result.droppedChars} characters to fit ${result.name}.`}
          </span>
        )}
      </a>
    );
  }
);
