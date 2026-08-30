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

/** Brand colours for the monogram fallback, from the registry. */
const MONOGRAM = {
  kagi: ['K', '#ffb319'],
  deepseek: ['D', '#4d6bfe'],
  t3chat: ['T', '#ca0277'],
  huggingchat: ['H', '#ff9d00'],
  duckai: ['D', '#de5833'],
  kimi: ['K', '#1a1a1a'],
  cursor: ['C', '#000000'],
  aistudio: ['G', '#4285f4'],
  'github-copilot': ['G', '#0078d4'],
  v0: ['V', '#000000'],
  scira: ['S', '#0f172a'],
};

const pascal = (id) =>
  id.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase()) + 'Logo';

/** Pull the viewBox and inner markup out of an SVG file. */
function parse(svg) {
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [, '0 0 24 24'])[1];
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
  return { viewBox, inner };
}

const parts = [];
const entries = [];

for (const [id, file] of Object.entries(MAP)) {
  const full = path.join(LOGO_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing logo file for "${id}": ${file}`);
  }
  const { viewBox, inner } = parse(fs.readFileSync(full, 'utf8'));
  const name = pascal(id);
  parts.push(
    `/** ${id} — from src/logos/${file}, unmodified. */\n` +
      `export const ${name}: React.FC<IconProps> = ({ size = 16, ...rest }) => (\n` +
      `  <svg width={size} height={size} viewBox="${viewBox}" aria-hidden="true" focusable="false" {...rest}>\n` +
      `    ${inner}\n` +
      `  </svg>\n` +
      `);\n${name}.displayName = ${JSON.stringify(name)};`
  );
  entries.push(`  ${JSON.stringify(id)}: ${name},`);
}

for (const [id, [letter, color]] of Object.entries(MONOGRAM)) {
  const name = pascal(id);
  parts.push(
    `/** ${id} — monogram. We hold no verified mark for this vendor. */\n` +
      `export const ${name}: React.FC<IconProps> = (props) => (\n` +
      `  <Monogram letter=${JSON.stringify(letter)} color=${JSON.stringify(color)} {...props} />\n` +
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

const Monogram: React.FC<IconProps & { letter: string; color: string }> = ({
  letter,
  color,
  size = 16,
  ...rest
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
    <rect width="24" height="24" rx="6" fill={color} />
    <text
      x="12"
      y="12"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#ffffff"
      fontSize="13"
      fontWeight="600"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    >
      {letter}
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
