"use client";

import { AskAI } from "@/components/ui/askai";

const SNIPPET = `export function total(items: { price: number }[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

/**
 * Every variant, on real content. Drop this into a docs page.
 */
export function AskAIDemo() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Default</p>
        <AskAI
          goal="Introduce this project and explain what makes it different."
          content="askai sends anything on a page to an AI with deep links that are verified weekly."
          title="Ask an AI about askai"
          description="Pick a destination. The prompt is already written."
        />
      </section>

      <section className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Compact, on code</p>
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs">
          <pre className="overflow-x-auto pe-14">{SNIPPET}</pre>
          <div className="absolute right-3 top-3">
            <AskAI
              sparkOnly
              size="compact"
              side="left"
              goal="Explain this function and suggest a test for it"
              content={{ text: SNIPPET, language: "ts" }}
              tooltip="ask an ai about this"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Every verified destination
        </p>
        <AskAI
          services="all"
          label="pick from 18"
          side="bottom"
          goal="Summarise this"
          content="Deep-link parameters are undocumented and change without notice. This package verifies them weekly and refuses the ones that never worked."
          description="All eighteen verified destinations. Deprecated ones are excluded automatically."
        />
      </section>
    </div>
  );
}
