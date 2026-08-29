import * as React from 'react';
import {
  buildPrompt,
  type AiService,
  type CreatePromptOptions,
  type PromptContent,
} from '../core';
import { getIcon, type ServiceIcons } from './icons';

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
    { goal, content, service, children, showIcon = true, icons, options, className, ...rest },
    ref
  ) {
    const result = buildPrompt(goal, content, service, options);
    const Icon = getIcon(String(service), icons);

    return (
      <a
        ref={ref}
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className={['askai', 'askai-link', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {showIcon && <Icon className="askai-icon" />}
        <span>{children ?? `Ask ${result.name}`}</span>
        {result.truncated && (
          <span className="askai-sr">
            {`Content shortened by ${result.droppedChars} characters to fit ${result.name}.`}
          </span>
        )}
      </a>
    );
  }
);
