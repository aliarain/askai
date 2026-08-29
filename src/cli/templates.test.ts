import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderCore, renderButton, renderLink } from './templates';
import { SERVICE_DEFINITIONS, DEFAULT_SERVICE_IDS } from '../core';

const selected = SERVICE_DEFINITIONS.filter((s) =>
  (DEFAULT_SERVICE_IDS as readonly string[]).includes(s.id)
);

describe('generated core', () => {
  const core = renderCore(selected);

  it('declares the services record exactly once', () => {
    // 1.x shipped a corrupted template in which a truncated SVG path had
    // swallowed the opening of a second services record, so the file the CLI
    // wrote never compiled. This is the assertion that would have caught it.
    const declarations = core.match(/export const services/g) ?? [];
    expect(declarations).toHaveLength(1);
  });

  it('emits one entry per selected service and nothing else', () => {
    for (const s of selected) {
      expect(core).toContain(`"${s.id}":`);
    }
    const excluded = SERVICE_DEFINITIONS.filter(
      (s) => !selected.some((sel) => sel.id === s.id)
    );
    for (const s of excluded) {
      expect(core, `${s.id} should not leak into the template`).not.toContain(
        `"${s.id}": {`
      );
    }
  });

  it('carries the verified parameter for each service', () => {
    for (const s of selected) {
      expect(core).toContain(`param: ${JSON.stringify(s.param)}`);
    }
  });

  it('has balanced braces', () => {
    const open = (core.match(/\{/g) ?? []).length;
    const close = (core.match(/\}/g) ?? []).length;
    expect(open).toBe(close);
  });

  it('never emits an unterminated string literal', () => {
    for (const [i, line] of core.split('\n').entries()) {
      const doubles = (line.match(/(?<!\\)"/g) ?? []).length;
      expect(doubles % 2, `line ${i + 1}: ${line}`).toBe(0);
    }
  });
});

describe('generated components', () => {
  it('marks the interactive button as a client component', () => {
    expect(renderButton(['chatgpt'], 'Explain')).toMatch(/^'use client';/);
  });

  it('leaves the link renderable on the server', () => {
    expect(renderLink('chatgpt', 'Explain')).not.toContain("'use client'");
  });

  it('renders anchors rather than window.open for navigation', () => {
    const button = renderButton(['chatgpt'], 'Explain');
    expect(button).toContain('href={result.url}');
    expect(button).toContain('rel="noopener noreferrer"');
  });

  it('injects the chosen defaults', () => {
    const button = renderButton(['claude', 'grok'], 'Review this diff');
    expect(button).toContain('"Review this diff"');
    expect(button).toContain('["claude","grok"]');
  });
});

describe('the generated project typechecks', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'askai-template-'));
    fs.writeFileSync(path.join(dir, 'core.ts'), renderCore(selected));
    fs.writeFileSync(
      path.join(dir, 'AskAiButton.tsx'),
      renderButton(selected.map((s) => s.id), 'Explain this code')
    );
    fs.writeFileSync(
      path.join(dir, 'AskAiLink.tsx'),
      renderLink(selected[0].id, 'Explain this code')
    );
    fs.writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          esModuleInterop: true,
          typeRoots: [path.resolve('node_modules/@types')],
          paths: { react: [path.resolve('node_modules/@types/react')] },
        },
        include: ['*.ts', '*.tsx'],
      })
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('compiles under strict TypeScript with no errors', () => {
    // The single highest-value test in this repo: 1.x shipped a template that
    // did not parse, because nothing ever compiled the generated output.
    let output = '';
    let failed = false;
    try {
      execFileSync(path.resolve('node_modules/.bin/tsc'), ['-p', dir], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      failed = true;
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    expect(failed, output).toBe(false);
  }, 60_000);
});
