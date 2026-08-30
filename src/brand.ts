/**
 * Vendor brand marks, as an opt-in subpath.
 *
 * Deliberately not exported from the package root. Shipping a third party's
 * trademark is a decision the consuming product must make for itself, so it
 * requires an explicit import:
 *
 *   import { logos } from '@raptrx/askai/logos';
 *   <AskAI icons={logos} … />
 *
 * Marks are reproduced exactly as supplied by each vendor. Check their brand
 * guidelines before shipping — most require the mark be used unaltered, and
 * several require written permission.
 */
export { logos } from './components/logos.generated';
export type { IconProps } from './components/icons';
