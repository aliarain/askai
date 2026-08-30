import fs from 'node:fs';
import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = ['react', 'react-dom', 'react/jsx-runtime'];
const cliExternal = ['prompts', 'picocolors', 'fs', 'path', 'node:fs', 'node:path'];

/** Copy the stylesheet into dist, since nothing imports it from JS. */
function copyStyles() {
  return {
    name: 'copy-styles',
    writeBundle() {
      const from = path.resolve('src/components/styles.css');
      const to = path.resolve('dist/styles.css');
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    },
  };
}

export default [
  // Core - ESM and CJS
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
      { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    ],
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
  },
  // React - ESM and CJS
  {
    input: 'src/react.ts',
    output: [
      // Rollup strips module-level directives when bundling, so the
      // `'use client'` in AskAI.tsx never reaches the output. Without it the
      // React App Router treats this as a server module and throws on the
      // first hook. Re-add it as a banner on the bundle itself.
      { file: 'dist/react.mjs', format: 'esm', sourcemap: true, banner: "'use client';" },
      { file: 'dist/react.js', format: 'cjs', sourcemap: true, banner: "'use client';" },
    ],
    external,
    onwarn(warning, warn) {
      // Expected: we re-add the directive as a banner above.
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
      warn(warning);
    },
    plugins: [typescript({ tsconfig: './tsconfig.build.json' }), copyStyles()],
  },
  // Brand logos - opt-in subpath
  {
    input: 'src/brand.ts',
    output: [
      { file: 'dist/logos.mjs', format: 'esm', sourcemap: true },
      { file: 'dist/logos.js', format: 'cjs', sourcemap: true },
    ],
    external,
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
  },
  // CLI - CJS (for Node.js)
  {
    input: 'src/cli/index.ts',
    output: {
      file: 'dist/cli.js',
      format: 'cjs',
      sourcemap: true,
      banner: '#!/usr/bin/env node',
    },
    external: cliExternal,
    plugins: [typescript({ tsconfig: './tsconfig.build.json' })],
  },
  // Core types
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
  // React types
  {
    input: 'src/react.ts',
    output: { file: 'dist/react.d.ts', format: 'esm' },
    external,
    plugins: [dts()],
  },
  // Brand logo types
  {
    input: 'src/brand.ts',
    output: { file: 'dist/logos.d.ts', format: 'esm' },
    external,
    plugins: [dts()],
  },
];
