## Installation

```bash
npx shadcn@latest add @raptrx/askai
```

Add the namespace once, in `components.json`:

```json
{
  "registries": {
    "@raptrx": "https://raw.githubusercontent.com/aliarain/askai/main/r/{name}.json"
  }
}
```

Or skip the namespace and install by URL:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/aliarain/askai/main/r/askai.json
```

## Usage

```tsx
import { AskAI } from "@/components/ui/askai";

export function CodeBlock({ code }: { code: string }) {
  return <AskAI goal="Explain this function" content={code} label="ask an ai" />;
}
```

## Why the data is a dependency

The file is yours — your Popover, your Tooltip, your tokens. The destinations
are not. Every URL, parameter and length cap comes from `@raptrx/askai`, which
re-verifies them weekly. A copied provider list is correct on the day you paste
it; six of the ten in this package's own 1.x were wrong within a year.
