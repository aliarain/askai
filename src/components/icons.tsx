import * as React from 'react';

/**
 * Neutral interface glyphs.
 *
 * This package deliberately ships no vendor logos. Every AI vendor's brand
 * guidelines require their mark to be used exactly as supplied, and most
 * prohibit pairing it with a third party's UI or recolouring it — which is what
 * a `currentColor` icon inside someone else's button does. Shipping marks in a
 * library would push that exposure onto every consumer, so destinations are
 * identified by name and a neutral glyph.
 *
 * If you have cleared a vendor's mark for your own product, pass it per service
 * via the `icons` prop. See the docs for the shape.
 *
 * All glyphs are 1.5px stroke on a 16px grid, matching the optical weight of
 * the 500-weight label beside them, and take their colour from `currentColor`.
 */

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function glyph(
  displayName: string,
  path: React.ReactNode
): React.FC<IconProps> {
  const Component: React.FC<IconProps> = ({ size = 16, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  );
  Component.displayName = displayName;
  return Component;
}

/** Default mark for an AI destination. */
export const SparkleIcon = glyph(
  'SparkleIcon',
  <path d="M8 1.75 9.4 5.9a2 2 0 0 0 1.2 1.2L14.25 8.5l-3.65 1.4a2 2 0 0 0-1.2 1.2L8 15.25l-1.4-4.15a2 2 0 0 0-1.2-1.2L1.75 8.5 5.4 7.1a2 2 0 0 0 1.2-1.2Z" />
);

export const CopyIcon = glyph(
  'CopyIcon',
  <>
    <rect x="5.75" y="5.75" width="8.5" height="8.5" rx="1.75" />
    <path d="M10.25 3.5v-.25A1.5 1.5 0 0 0 8.75 1.75h-5.5A1.5 1.5 0 0 0 1.75 3.25v5.5a1.5 1.5 0 0 0 1.5 1.5h.25" />
  </>
);

export const CheckIcon = glyph('CheckIcon', <path d="m3 8.5 3.5 3.5L13 4.5" />);

export const ChevronDownIcon = glyph(
  'ChevronDownIcon',
  <path d="m4 6.25 4 4 4-4" />
);

/** Marks a menu item that leaves the page. */
export const ExternalIcon = glyph(
  'ExternalIcon',
  <>
    <path d="M6.25 3.25h-2A1.5 1.5 0 0 0 2.75 4.75v7a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-2" />
    <path d="M9.5 2.75h3.75V6.5M13 3 7.25 8.75" />
  </>
);

export const MarkdownIcon = glyph(
  'MarkdownIcon',
  <>
    <rect x="1.75" y="3.75" width="12.5" height="8.5" rx="1.75" />
    <path d="M4.25 10V6l2 2.25L8.25 6v4M10.75 6v4M9.5 8.75l1.25 1.25L12 8.75" />
  </>
);

/**
 * Map of service id to a custom icon component.
 *
 * @example
 * <AskAI icons={{ chatgpt: MyClearedOpenAiMark }} … />
 */
export type ServiceIcons = Record<string, React.FC<IconProps>>;

/** Resolve the glyph for a destination, falling back to the neutral sparkle. */
export function getIcon(service: string, icons?: ServiceIcons): React.FC<IconProps> {
  return icons?.[service] ?? SparkleIcon;
}
