'use client';

import * as React from 'react';
import type {
  AiService,
  CreatePromptOptions,
  PromptContent,
  PromptResult,
} from '../core';
import { useAskAI } from './useAskAI';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  getIcon,
  type ServiceIcons,
} from './icons';

/** The styleable parts of the control. */
export interface AskAIClassNames {
  root?: string;
  group?: string;
  copyButton?: string;
  trigger?: string;
  divider?: string;
  caret?: string;
  menu?: string;
  item?: string;
  itemLabel?: string;
  itemHint?: string;
  icon?: string;
  separator?: string;
  footer?: string;
}

export interface AskAIProps {
  /** What you want the AI to do, e.g. "Explain this function". */
  goal: string;
  /** The content to send. */
  content: PromptContent;
  /**
   * Destinations to offer. `'default'` is a short curated set, `'all'` is
   * every verified destination.
   */
  services?: AiService[] | 'all' | 'default';
  /** Label on the primary half. */
  label?: string;
  /** Label shown for two seconds after a successful copy. */
  copiedLabel?: string;
  /** Custom icons per service. See `@raptrx/askai/logos` for vendor marks. */
  icons?: ServiceIcons;
  /** Force a colour scheme instead of following the system. */
  theme?: 'light' | 'dark' | 'auto';
  /** Which edge the menu aligns to. */
  align?: 'start' | 'end';
  /**
   * Drop every built-in class name, keeping only behaviour, ARIA and your own
   * classes. Use with `classNames` to render the control entirely in your own
   * design system — Tailwind, CSS modules, whatever you already have.
   *
   * You do not need the stylesheet in this mode.
   */
  unstyled?: boolean;
  /** Per-part class names, merged after the built-in ones. */
  classNames?: AskAIClassNames;
  /** Hide the explanatory line under the menu. */
  hideFooter?: boolean;
  /** Prompt-building options, forwarded to the core builder. */
  options?: CreatePromptOptions;
  /** Called after the prompt is copied. */
  onCopy?: (prompt: string) => void;
  /** Called when a destination is chosen, before the tab opens. */
  onOpen?: (result: PromptResult) => void;
  className?: string;
  style?: React.CSSProperties;
}

/** Join the built-in class with the consumer's, honouring `unstyled`. */
function cx(builtIn: string | undefined, custom: string | undefined, unstyled: boolean) {
  return [unstyled ? undefined : builtIn, custom].filter(Boolean).join(' ') || undefined;
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
 * menu says which do which.
 *
 * To restyle it, in increasing order of control: override the CSS custom
 * properties, pass `classNames` per part, set `unstyled` and bring your own
 * classes, or drop to {@link useAskAI} and render your own markup.
 */
export const AskAI: React.FC<AskAIProps> = ({
  goal,
  content,
  services,
  label = 'Copy prompt',
  copiedLabel = 'Copied',
  icons,
  theme = 'auto',
  align = 'end',
  unstyled = false,
  classNames: cn = {},
  hideFooter = false,
  options,
  onCopy,
  onOpen,
  className,
  style,
}) => {
  const ai = useAskAI({ goal, content, services, options, onCopy, onOpen });
  const CopyGlyph = ai.copied ? CheckIcon : CopyIcon;

  return (
    <div
      {...ai.getRootProps()}
      className={cx('askai', [cn.root, className].filter(Boolean).join(' '), unstyled)}
      data-theme={theme === 'auto' ? undefined : theme}
      style={style}
    >
      <div className={cx('askai-group', cn.group, unstyled)}>
        <button
          {...ai.getCopyButtonProps()}
          className={cx('askai-btn askai-btn--primary', cn.copyButton, unstyled)}
        >
          <CopyGlyph className={cx('askai-icon', cn.icon, unstyled)} />
          {/* The label changes as well as the icon, so the state is never
              carried by the glyph alone. */}
          <span>{ai.copied ? copiedLabel : label}</span>
        </button>

        <div className={cx('askai-divider', cn.divider, unstyled)} aria-hidden="true" />

        <button
          {...ai.getTriggerProps()}
          className={cx('askai-btn askai-btn--trigger', cn.trigger, unstyled)}
        >
          <ChevronDownIcon
            className={cx('askai-icon askai-caret', cn.caret, unstyled)}
          />
        </button>
      </div>

      {ai.isOpen && (
        <ul
          {...ai.getMenuProps()}
          className={cx('askai-menu', cn.menu, unstyled)}
          data-align={align}
        >
          {ai.destinations.map((result, i) => {
            const Icon = getIcon(String(result.service), icons);
            const { key, ...itemProps } = ai.getItemProps(i);
            return (
              <li key={key} role="none">
                <a
                  {...itemProps}
                  className={cx('askai-item', cn.item, unstyled)}
                  data-active={ai.activeIndex === i || undefined}
                >
                  <Icon className={cx('askai-icon', cn.icon, unstyled)} />
                  <span className={cx('askai-item-label', cn.itemLabel, unstyled)}>
                    {result.name}
                  </span>
                  <span className={cx('askai-item-hint', cn.itemHint, unstyled)}>
                    {result.autoSubmit ? 'Runs' : 'Ready'}
                  </span>
                  {result.truncated && (
                    <span className={unstyled ? undefined : 'askai-sr'}>
                      {`Content shortened by ${result.droppedChars} characters to fit ${result.name}. Use ${label} to send all of it.`}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
          {!hideFooter && (
            <>
              <li role="none">
                <hr className={cx('askai-sep', cn.separator, unstyled)} />
              </li>
              <li role="none" className={cx('askai-section', cn.footer, unstyled)}>
                Opens in a new tab. &ldquo;Ready&rdquo; means press Enter to send.
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
};

AskAI.displayName = 'AskAI';
