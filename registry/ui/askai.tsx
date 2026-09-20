"use client";

/**
 * askai — a popover launcher that sends anything on your page to an AI.
 *
 * Installed with `npx shadcn@latest add @raptrx/askai`, so this file is yours:
 * it uses your Popover and your Tailwind tokens. The one thing it
 * does not own is the destination data. Deep-link parameters are undocumented
 * and change without notice, so the URL, parameter, length cap and auto-submit
 * behaviour for every destination come from `@raptrx/askai`, where they are
 * re-verified weekly. A copy-pasted list rots; a dependency updates.
 */

import * as React from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  buildPrompt,
  DEFAULT_SERVICE_IDS,
  VERIFIED_SERVICE_IDS,
  type AiService,
  type PromptContent,
  type PromptResult,
} from "@raptrx/askai";
import { logos } from "@raptrx/askai/logos";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// No Tooltip primitive on purpose. shadcn now ships two generations of it —
// Radix, composed with `asChild`, and Base UI, composed with `render` — and a
// file that nests a trigger inside a trigger can only be written for one. The
// hover-revealed name on each destination carries the same information.

// ---------------------------------------------------------------------------
// Mascot
// ---------------------------------------------------------------------------

/**
 * A sparkle that breathes, and wakes up when the popover opens.
 *
 * Purely decorative — `aria-hidden` — and driven by two keyframes the registry
 * installs into your stylesheet (`askai-breathe`, `askai-orbit`). Swap it out
 * with the `mascot` prop if it does not suit the page.
 */
export function AskAISpark({
  awake = false,
  size = "default",
  className,
}: {
  awake?: boolean;
  size?: "default" | "compact";
  className?: string;
}) {
  const px = size === "compact" ? 28 : 36;
  return (
    <span
      aria-hidden="true"
      data-awake={awake || undefined}
      className={cn(
        "group/spark relative inline-grid shrink-0 place-items-center rounded-[11px]",
        "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent",
        "ring-1 ring-inset ring-primary/15 transition-colors duration-300",
        "data-[awake]:from-primary/25 data-[awake]:ring-primary/30",
        className
      )}
      style={{ width: px, height: px }}
    >
      {/* Main star: breathes on a slow loop, snaps to full when awake. */}
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "text-primary transition-transform duration-300 ease-out",
          "animate-[askai-breathe_3.6s_ease-in-out_infinite]",
          "group-data-[awake]/spark:rotate-[15deg] group-data-[awake]/spark:scale-110"
        )}
        style={{ width: px * 0.55, height: px * 0.55 }}
        fill="currentColor"
      >
        <path d="M8 1.75 9.4 5.9a2 2 0 0 0 1.2 1.2L14.25 8.5l-3.65 1.4a2 2 0 0 0-1.2 1.2L8 15.25l-1.4-4.15a2 2 0 0 0-1.2-1.2L1.75 8.5 5.4 7.1a2 2 0 0 0 1.2-1.2Z" />
      </svg>
      {/* Two satellites: parked when idle, orbit when awake. */}
      {[0, 1].map((i) => (
        <svg
          key={i}
          viewBox="0 0 16 16"
          fill="currentColor"
          className={cn(
            "absolute text-primary/70 opacity-0 transition-opacity duration-300",
            "group-data-[awake]/spark:opacity-100",
            "group-data-[awake]/spark:animate-[askai-orbit_2.8s_linear_infinite]"
          )}
          style={{
            width: px * 0.22,
            height: px * 0.22,
            animationDelay: i ? "-1.4s" : "0s",
            // Orbit radius, read by the keyframe.
            ["--askai-r" as string]: `${px * 0.38}px`,
          }}
        >
          <path d="M8 3 9 6.6 12.5 8 9 9.4 8 13 7 9.4 3.5 8 7 6.6Z" />
        </svg>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type AskAIProps = {
  /** What to send. A string, `{ text, language }`, or any object (JSON). */
  content: PromptContent;
  /** What you want the AI to do. Defaults to a neutral instruction. */
  goal?: string;
  /** Heading inside the popover. */
  title?: string;
  /** Sub-heading inside the popover. */
  description?: string;
  /** Text on the trigger. Ignored when `sparkOnly`. */
  label?: string;
  /** Native title on the trigger. Defaults to the label when `sparkOnly`. */
  tooltip?: string;
  /** Render just the mascot in a round trigger, no label. */
  sparkOnly?: boolean;
  /** Replace the default mascot. */
  mascot?: React.ReactNode;
  /**
   * Destinations to offer. `'default'` is four, `'all'` is every verified one.
   * Deprecated ids (Gemini, Microsoft Copilot) throw — they never worked.
   */
  services?: AiService[] | "default" | "all";
  size?: "default" | "compact";
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after a successful copy. */
  onCopy?: (prompt: string) => void;
  /** Called when a destination is chosen. */
  onOpen?: (result: PromptResult) => void;
  className?: string;
  style?: React.CSSProperties;
};

function resolveServices(services: AskAIProps["services"]): AiService[] {
  if (services === "all") return [...VERIFIED_SERVICE_IDS];
  if (!services || services === "default") return [...DEFAULT_SERVICE_IDS];
  return services;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AskAI({
  content,
  goal = "Help me with this",
  title = "Ask an AI about this",
  description = "Pick where to send it. The prompt is ready to go.",
  label = "ask an ai",
  tooltip,
  sparkOnly = false,
  mascot,
  services,
  size = "default",
  side = "top",
  align = "end",
  defaultOpen = false,
  open,
  onOpenChange,
  onCopy,
  onOpen,
  className,
  style,
}: AskAIProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const changeOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange]
  );

  const [copied, setCopied] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);

  const ids = React.useMemo(() => resolveServices(services), [services]);

  // One result per destination. A deprecated id must not take the whole
  // control down, so it is dropped rather than thrown here.
  const results = React.useMemo(
    () =>
      ids.flatMap((id) => {
        try {
          return [buildPrompt(goal, content, id)];
        } catch {
          return [];
        }
      }),
    [ids, goal, content]
  );

  // The clipboard gets the untruncated prompt: it has no length ceiling.
  const fullPrompt = React.useMemo(() => {
    const text =
      typeof content === "string"
        ? content
        : "text" in (content as object)
          ? (content as { text: string }).text
          : JSON.stringify(content, null, 2);
    return `${goal}\n\n${text}`;
  }, [goal, content]);

  const truncatedCount = results.filter((r) => r.truncated).length;

  // A row of tall tiles reads well up to five destinations. Past that it
  // collapses into slivers, so switch to a grid of squarer tiles.
  const dense = results.length > 5;

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyPrompt = React.useCallback(async () => {
    const ok = await writeClipboard(fullPrompt);
    if (ok) {
      setCopied(true);
      setFallback(false);
      onCopy?.(fullPrompt);
    } else {
      // Browser refused the clipboard; give them something to select.
      setFallback(true);
    }
  }, [fullPrompt, onCopy]);

  const tooltipText = tooltip ?? (sparkOnly ? label : undefined);

  const trigger = (
    <PopoverTrigger
      className={cn(
        "group inline-flex cursor-pointer items-center justify-center text-foreground",
        "transition-[transform,background-color,box-shadow] duration-200 ease-out",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=open]:bg-muted/60",
        sparkOnly
          ? cn(
              "rounded-full bg-muted/30 ring-1 ring-inset ring-border/60",
              size === "compact" ? "size-11" : "size-14"
            )
          : cn(
              "rounded-full bg-muted/30 ring-1 ring-inset ring-border/60 font-medium tracking-tight",
              size === "compact"
                ? "h-11 gap-2.5 ps-3.5 pe-2 text-sm"
                : "h-14 gap-3.5 ps-5 pe-2.5 text-base"
            ),
        className
      )}
      style={style}
      aria-label={sparkOnly ? tooltipText ?? label : undefined}
      title={tooltipText}
    >
      {!sparkOnly && <span>{label}</span>}
      <span className="transition-transform duration-200 group-hover:-translate-y-0.5">
        {mascot ?? <AskAISpark awake={isOpen} size={size} />}
      </span>
    </PopoverTrigger>
  );

  return (
    <Popover open={isOpen} onOpenChange={changeOpen}>
      {trigger}

        <PopoverContent
          side={side}
          align={align}
          sideOffset={14}
          className={cn(
            "w-[21rem] max-w-[calc(100vw-1.5rem)] rounded-[22px] p-4 sm:w-96 sm:p-5",
            "bg-background/85 text-foreground shadow-xl ring-1 ring-inset ring-border/50 backdrop-blur-xl backdrop-saturate-150"
          )}
        >
          <p className="text-sm font-medium tracking-tight sm:text-base">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>

          <div
            className={cn("mt-4 gap-1.5", dense ? "grid grid-cols-6" : "flex")}
            role="group"
            aria-label="Choose an AI assistant"
          >
            {results.map((r) => {
              const Mark = logos[String(r.service)];
              const hint = r.autoSubmit
                ? `runs in ${r.name}`
                : `opens ${r.name} — press Enter to send`;
              return (
                    <a
                      key={String(r.service)}
                      title={hint}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onOpen?.(r)}
                      aria-label={`${r.name}: ${r.autoSubmit ? "runs the prompt on arrival" : "opens with the prompt ready to send"}${
                        r.truncated ? `, shortened by ${r.droppedChars} characters` : ""
                      }`}
                      className={cn(
                        "group/item relative flex min-w-0 items-center justify-center bg-muted text-foreground/60",
                        "transition-[transform,background-color,color,box-shadow] duration-200 ease-out",
                        "hover:-translate-y-1 hover:bg-background hover:text-foreground hover:shadow-md",
                        "focus-visible:-translate-y-1 focus-visible:bg-background focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        dense
                          ? "h-12 rounded-[12px]"
                          : "h-[4.5rem] flex-1 rounded-[14px] first:rounded-l-[18px] last:rounded-r-[18px]"
                      )}
                    >
                      {Mark ? (
                        <Mark
                          size={dense ? 20 : 26}
                          className="transition-transform duration-200 group-hover/item:-translate-y-1.5 group-hover/item:scale-[.94] group-focus-visible/item:-translate-y-1.5"
                        />
                      ) : (
                        <span className="text-sm font-semibold">{r.name.slice(0, 2)}</span>
                      )}
                      {!dense && (
                        <span className="absolute bottom-1.5 translate-y-1 text-[10px] opacity-0 transition-[opacity,transform] duration-200 group-hover/item:translate-y-0 group-hover/item:opacity-100 group-focus-visible/item:translate-y-0 group-focus-visible/item:opacity-100">
                          {r.name}
                        </span>
                      )}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 size-3 text-primary opacity-0 transition-opacity duration-200 group-hover/item:opacity-100 group-focus-visible/item:opacity-100"
                      />
                      {r.truncated && (
                        <span
                          aria-hidden="true"
                          className="absolute left-1.5 top-1.5 size-1.5 rounded-full bg-amber-500"
                          title="Shortened to fit"
                        />
                      )}
                    </a>
              );
            })}
          </div>

          {truncatedCount > 0 && (
            <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
              <span className="me-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />
              Shortened to fit {truncatedCount === 1 ? "one link" : `${truncatedCount} links`}.
              Copy sends all of it.
            </p>
          )}

          <button
            type="button"
            onClick={() => void copyPrompt()}
            className={cn(
              "mt-3 flex min-h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "[&_svg]:size-3.5"
            )}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? "copied" : "copy the prompt instead"}</span>
          </button>

          {fallback && (
            <textarea
              readOnly
              rows={3}
              value={fullPrompt}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Select and copy this prompt"
              className="mt-3 w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </PopoverContent>
    </Popover>
  );
}
