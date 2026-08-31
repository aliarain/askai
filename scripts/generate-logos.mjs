/**
 * Generate React components from the SVGs in src/logos.
 *
 * The marks are passed through untouched — same paths, same fills, same
 * viewBox. That is deliberate: every vendor's brand guidelines require their
 * mark be used exactly as supplied, so this generator must never recolour,
 * simplify or redraw. If a mark needs to change, replace the .svg file.
 *
 * Run: npm run generate:logos
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_DIR = path.join(root, 'src/logos');
const OUT = path.join(root, 'src/components/logos.generated.tsx');

/**
 * Service id -> the file holding that vendor's official mark.
 *
 * A service is listed here only when we hold a mark we have actually verified
 * renders as the vendor's real logo. Everything else falls back to a monogram,
 * because an approximated logo is worse than no logo: it is both visibly wrong
 * and, being an altered mark, the thing vendors most clearly prohibit.
 */
const MAP = {
  chatgpt: 'openai.svg',
  claude: 'claude-color.svg',
  grok: 'grok.svg',
  perplexity: 'perplexity-color.svg',
  mistral: 'mistral-color.svg',
  qwen: 'qwen-color.svg',
  zai: 'zai.svg',
};

/**
 * Monogram fallbacks, for vendors whose real mark we do not hold.
 *
 * Two letters, not one: at `services="all"` a single letter collides three
 * ways — DeepSeek/Duck.ai, AI Studio/GitHub Copilot, Kagi/Kimi — and the icon
 * column exists precisely to tell those rows apart.
 */
const MONOGRAM = {
  kagi: ['Kg', '#ffb319'],
  deepseek: ['Ds', '#4d6bfe'],
  t3chat: ['T3', '#ca0277'],
  huggingchat: ['Hf', '#ff9d00'],
  duckai: ['Dd', '#de5833'],
  kimi: ['Km', '#1a1a1a'],
  cursor: ['Cu', '#000000'],
  aistudio: ['As', '#4285f4'],
  'github-copilot': ['Gh', '#0078d4'],
  v0: ['v0', '#000000'],
  scira: ['Sc', '#0f172a'],
};

/** WCAG relative luminance, so ink can be chosen rather than assumed. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Pick the ink that actually reads on this tile.
 *
 * White on Kagi's #ffb319 measures 1.77:1 and on HuggingChat's #ff9d00 2.08:1 —
 * both illegible. Choose whichever of near-black or white contrasts better
 * rather than defaulting to white.
 */
function inkFor(tile) {
  return contrast(tile, '#ffffff') >= contrast(tile, '#151517') ? '#ffffff' : '#151517';
}

const pascal = (id) =>
  id.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase()) + 'Logo';

/** React equivalent of a hyphenated SVG attribute. */
function camel(attr) {
  return attr.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

/**
 * Presentation attributes that live on the root `<svg>` and are inherited by
 * every child.
 *
 * Dropping these silently changes the mark. `fill="currentColor"` is what makes
 * a monochrome logo take the surrounding text colour — without it the paths
 * default to black and vanish on a dark menu — and `fill-rule="evenodd"` is
 * what punches the holes out of the OpenAI knot. Neither is decoration.
 */
const INHERITED = [
  'fill',
  'fill-rule',
  'clip-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
];

/** Pull the viewBox, inherited presentation attributes, and inner markup. */
function parse(svg) {
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [, '0 0 24 24'])[1];

  const root = (svg.match(/<svg[^>]*>/) || [''])[0];
  const rootAttrs = {};
  for (const attr of INHERITED) {
    const m = root.match(new RegExp(`\\s${attr}="([^"]*)"`));
    if (m) rootAttrs[camel(attr)] = m[1];
  }

  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    // React needs SVG presentation attributes camelCased (stop-color ->
    // stopColor). data-* and aria-* are the two families it wants left alone.
    .replace(/\s([a-z]+(?:-[a-z]+)+)=("[^"]*")/g, (whole, attr, value) => {
      if (/^(data|aria)-/.test(attr)) return whole;
      const camel = attr.replace(/-(\w)/g, (_, c) => c.toUpperCase());
      return ` ${camel}=${value}`;
    })
    .trim();
  return { viewBox, inner, rootAttrs };
}

const parts = [];
const entries = [];

for (const [id, file] of Object.entries(MAP)) {
  const full = path.join(LOGO_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing logo file for "${id}": ${file}`);
  }
  const { viewBox, inner, rootAttrs } = parse(fs.readFileSync(full, 'utf8'));
  const name = pascal(id);
  const attrs = Object.entries(rootAttrs)
    .map(([k, v]) => ` ${k}=${JSON.stringify(v)}`)
    .join('');
  parts.push(
    `/** ${id} — from src/logos/${file}, unmodified. */\n` +
      `export const ${name}: React.FC<IconProps> = ({ size = 16, ...rest }) => (\n` +
      `  <svg width={size} height={size} viewBox="${viewBox}"${attrs} aria-hidden="true" focusable="false" {...rest}>\n` +
      `    ${inner}\n` +
      `  </svg>\n` +
      `);\n${name}.displayName = ${JSON.stringify(name)};`
  );
  entries.push(`  ${JSON.stringify(id)}: ${name},`);
}

for (const [id, [letters, color]] of Object.entries(MONOGRAM)) {
  const name = pascal(id);
  const ink = inkFor(color);
  parts.push(
    `/** ${id} — monogram (${contrast(color, ink).toFixed(2)}:1). No verified mark held. */\n` +
      `export const ${name}: React.FC<IconProps> = (props) => (\n` +
      `  <Monogram letters=${JSON.stringify(letters)} color=${JSON.stringify(color)} ink=${JSON.stringify(ink)} {...props} />\n` +
      `);\n${name}.displayName = ${JSON.stringify(name)};`
  );
  entries.push(`  ${JSON.stringify(id)}: ${name},`);
}

const out = `/* eslint-disable */
/**
 * GENERATED FILE — do not edit.
 * Run \`npm run generate:logos\` after changing src/logos/*.svg.
 *
 * Vendor marks are reproduced exactly as supplied. Do not recolour them, do
 * not force currentColor, and do not redraw them to match a design system:
 * every vendor's brand terms require the mark be used unaltered.
 *
 * These are NOT exported from the package root. Import them deliberately:
 *
 *   import { logos } from '@raptrx/askai/logos';
 *   <AskAI icons={logos} … />
 *
 * Using a third party's trademark in your product is your decision to make.
 * Check each vendor's brand guidelines before shipping.
 */
import * as React from 'react';
import type { IconProps } from './icons';

/**
 * A two-letter tile in the vendor's brand colour.
 *
 * The hairline ring is \`currentColor\` at low opacity, so it follows the
 * surrounding text: light on a dark menu, dark on a light one. Without it the
 * near-black tiles (Kimi, Cursor, v0, Scira) disappear entirely against the
 * dark surface, which is exactly the failure a fallback is supposed to prevent.
 */
const Monogram: React.FC<
  IconProps & { letters: string; color: string; ink: string }
> = ({ letters, color, ink, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
    <rect width="24" height="24" rx="6" fill={color} />
    <rect
      x="0.5"
      y="0.5"
      width="23"
      height="23"
      rx="5.5"
      fill="none"
      stroke="currentColor"
      strokeOpacity="0.22"
    />
    <text
      x="12"
      y="12.5"
      textAnchor="middle"
      dominantBaseline="central"
      fill={ink}
      fontSize="11"
      fontWeight="650"
      letterSpacing="-0.5"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    >
      {letters}
    </text>
  </svg>
);

${parts.join('\n\n')}

/** Every mark, keyed by service id. Pass straight to the \`icons\` prop. */
export const logos: Record<string, React.FC<IconProps>> = {
${entries.join('\n')}
};
`;

fs.writeFileSync(OUT, out);
console.log(
  `Wrote ${path.relative(root, OUT)} — ` +
    `${Object.keys(MAP).length} vendor marks, ${Object.keys(MONOGRAM).length} monograms.`
);
