// The Popover surface both shadcn generations expose. Radix (asChild) and
// Base UI (render) differ in how they compose triggers, so only the props
// this component actually relies on are declared here — if the file starts
// using something outside this set, the registry typecheck fails, which is
// the point.
import * as React from 'react';

export declare function Popover(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}): React.JSX.Element;

export declare function PopoverTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }
): React.JSX.Element;

export declare function PopoverContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    children?: React.ReactNode;
  }
): React.JSX.Element;
