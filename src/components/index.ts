// Components
export { AskAI, type AskAIProps, type AskAIClassNames } from './AskAI';
export { AskAILink, type AskAILinkProps } from './AskAILink';

// Headless: the behaviour with no markup, for your own design system.
export { useAskAI, type UseAskAIOptions, type UseAskAIResult } from './useAskAI';

// Glyphs. No vendor logos ship with this package; supply your own via `icons`.
export {
  SparkleIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalIcon,
  MarkdownIcon,
  getIcon,
  type IconProps,
  type ServiceIcons,
} from './icons';

// Core utilities, re-exported for convenience.
export * from '../core';
