/**
 * Emit the shadcn registry from registry/ into r/.
 *
 *   npx shadcn@latest add https://raw.githubusercontent.com/aliarain/askai/main/r/askai.json
 *
 * or, with the namespace configured in components.json:
 *
 *   npx shadcn@latest add @raptrx/askai
 *
 * Run: npm run build:registry
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const OUT = path.join(root, 'r');

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/**
 * Keyframes the mascot relies on. Shipped via the registry's `css` field so
 * they are added to the consumer's stylesheet on install — a component file
 * cannot carry @keyframes on its own.
 */
const css = {
  '@keyframes askai-breathe': {
    '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '0.85' },
    '50%': { transform: 'scale(1.08) rotate(8deg)', opacity: '1' },
  },
  '@keyframes askai-orbit': {
    from: { transform: 'rotate(0deg) translateX(var(--askai-r, 14px)) rotate(0deg)' },
    to: { transform: 'rotate(360deg) translateX(var(--askai-r, 14px)) rotate(-360deg)' },
  },
};

const items = [
  {
    name: 'askai',
    type: 'registry:ui',
    title: 'Ask AI',
    description:
      'A popover launcher that sends anything on your page to ChatGPT, Claude, Perplexity, Grok and fourteen more — with deep links that are verified weekly rather than copied once.',
    // The UI is yours; the destination data is a dependency on purpose. Deep-link
    // parameters rot, and a dependency updates where a copy cannot.
    dependencies: [`@raptrx/askai@^${pkg.version}`, 'lucide-react'],
    registryDependencies: ['popover'],
    files: [
      {
        path: 'registry/ui/askai.tsx',
        type: 'registry:ui',
        target: 'components/ui/askai.tsx',
      },
    ],
    css,
    docs: read('registry/docs/askai.md'),
    categories: ['ai', 'buttons'],
  },
  {
    name: 'askai-demo',
    type: 'registry:example',
    title: 'Ask AI demo',
    description: 'The demo from the docs: every variant of the launcher, wired to real content.',
    registryDependencies: ['@raptrx/askai'],
    files: [
      {
        path: 'registry/examples/askai-demo.tsx',
        type: 'registry:example',
        target: 'components/askai-demo.tsx',
      },
    ],
  },
];

fs.mkdirSync(OUT, { recursive: true });

// One file per item, with content inlined — this is what `shadcn add <url>` fetches.
for (const item of items) {
  const withContent = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    ...item,
    files: item.files.map((f) => ({ ...f, content: read(f.path) })),
  };
  fs.writeFileSync(path.join(OUT, `${item.name}.json`), JSON.stringify(withContent, null, 2) + '\n');
}

// The index, without content — what a namespace resolves against.
const index = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: 'raptrx',
  homepage: 'https://docs.aliarain.com/askai',
  items: items.map(({ docs, css: _css, ...rest }) => rest),
};
fs.writeFileSync(path.join(OUT, 'registry.json'), JSON.stringify(index, null, 2) + '\n');

console.log(`Wrote r/registry.json and ${items.map((i) => `r/${i.name}.json`).join(', ')}`);
