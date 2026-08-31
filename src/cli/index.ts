import prompts from 'prompts';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import {
  SERVICE_DEFINITIONS,
  DEFAULT_SERVICE_IDS,
  type ServiceDefinition,
} from '../core';
import { renderCore, renderButton, renderLink } from './templates';

const VERSION = '2.0.0';

const LOGO = `
  ${pc.bold(pc.cyan('askai'))} ${pc.dim('v' + VERSION)}
  ${pc.dim('Ask AI buttons you own, with verified deep links')}
`;

/** Selectable destinations, newest-verified first, deprecated ones excluded. */
const SELECTABLE: ServiceDefinition[] = SERVICE_DEFINITIONS.filter(
  (s) => s.tier !== 'deprecated'
);

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function detectFramework(cwd: string): { framework: string; suggestedPath: string } {
  const pkgPath = path.join(cwd, 'package.json');
  let framework = 'React';

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) framework = 'Next.js';
      else if (deps.vite) framework = 'Vite';
      else if (deps['@remix-run/react']) framework = 'Remix';
      else if (deps.astro) framework = 'Astro';
    } catch {
      // A malformed package.json is the consumer's problem, not ours; fall
      // back to the generic suggestion rather than failing the command.
    }
  }

  const hasSrc = fs.existsSync(path.join(cwd, 'src'));
  const suggestedPath = hasSrc ? './src/components/ask-ai' : './components/ask-ai';
  return { framework, suggestedPath };
}

async function init(): Promise<void> {
  console.log(LOGO);

  const cwd = process.cwd();
  const { framework, suggestedPath } = detectFramework(cwd);
  console.log(pc.dim(`  Detected ${pc.cyan(framework)}.`));
  console.log();

  const response = await prompts([
    {
      type: 'text',
      name: 'goal',
      message: 'Default goal for the prompt',
      initial: 'Explain this code',
    },
    {
      type: 'multiselect',
      name: 'services',
      message: 'Destinations to include',
      instructions: false,
      hint: '- space to select, enter to confirm',
      min: 1,
      choices: SELECTABLE.map((s) => ({
        title: s.name,
        value: s.id,
        description:
          (s.tier === 'experimental' ? 'experimental · ' : '') +
          (s.autoSubmit ? 'runs the prompt' : 'fills the composer'),
        selected: (DEFAULT_SERVICE_IDS as readonly string[]).includes(s.id),
      })),
    },
    {
      type: 'text',
      name: 'dir',
      message: 'Where should the components go?',
      initial: suggestedPath,
    },
  ]);

  if (!response.dir || !response.services?.length) {
    console.log(pc.dim('  Cancelled.'));
    return;
  }

  const selected: ServiceDefinition[] = SELECTABLE.filter((s) =>
    (response.services as string[]).includes(s.id)
  );

  const outDir = path.resolve(cwd, response.dir);
  const files: Array<[string, string]> = [
    ['core.ts', renderCore(selected)],
    ['AskAiButton.tsx', renderButton(selected.map((s) => s.id), response.goal)],
    ['AskAiLink.tsx', renderLink(selected[0].id, response.goal)],
  ];

  for (const [name, contents] of files) {
    const target = path.join(outDir, name);
    ensureDir(target);
    fs.writeFileSync(target, contents);
    console.log(pc.green('  ✓'), 'Created', pc.cyan(path.relative(cwd, target)));
  }

  fs.writeFileSync(
    path.join(cwd, '.askaiconfig.json'),
    JSON.stringify(
      {
        version: VERSION,
        goal: response.goal,
        services: selected.map((s) => s.id),
        dir: response.dir,
        framework,
      },
      null,
      2
    ) + '\n'
  );

  const notes = selected.filter((s) => !s.autoSubmit);
  console.log();
  console.log(pc.bold('  Next steps'));
  console.log();
  console.log(
    '    ' + pc.cyan(`import { AskAiButton } from '${response.dir}/AskAiButton'`)
  );
  console.log('    ' + pc.cyan('<AskAiButton content={yourContent} />'));
  console.log();
  if (notes.length) {
    console.log(
      pc.dim(
        `    ${notes.length} of ${selected.length} destinations fill the composer\n` +
          '    rather than sending. Label your button accordingly.'
      )
    );
    console.log();
  }

  console.log(
    pc.dim('  Docs ') +
      pc.cyan('https://docs.aliarain.com/askai') +
      pc.dim('  ·  Built by Ali Arain ') +
      pc.cyan('https://aliarain.com')
  );
  console.log();
}

function showHelp(): void {
  console.log(LOGO);
  console.log(
    pc.bold('  Usage') +
      '\n    npx @raptrx/askai ' +
      pc.cyan('<command>') +
      '\n\n' +
      pc.bold('  Commands') +
      '\n    ' +
      pc.cyan('init') +
      '        Generate Ask AI components in your project' +
      '\n    ' +
      pc.cyan('list') +
      '        Show every destination and its verification status' +
      '\n\n' +
      pc.dim('  Docs   https://docs.aliarain.com/askai') +
      '\n' +
      pc.dim('  Built by Ali Arain — https://aliarain.com') +
      '\n'
  );
}

function list(): void {
  console.log(LOGO);
  const width = Math.max(...SERVICE_DEFINITIONS.map((s) => s.name.length));
  for (const tier of ['verified', 'experimental', 'deprecated'] as const) {
    const rows = SERVICE_DEFINITIONS.filter((s) => s.tier === tier);
    if (!rows.length) continue;
    const color = tier === 'verified' ? pc.green : tier === 'experimental' ? pc.yellow : pc.red;
    console.log('  ' + color(pc.bold(tier)));
    for (const s of rows) {
      console.log(
        '    ' +
          s.name.padEnd(width) +
          '  ' +
          pc.dim(
            tier === 'deprecated'
              ? 'no prefill support'
              : `?${s.param}=  ·  ${s.maxLength} chars (${s.capSource ?? 'assumed'})  ·  ${s.autoSubmit ? 'runs' : 'fills'}`
          )
      );
    }
    console.log();
  }
  console.log(
    pc.dim('  Parameters re-verified weekly. Report drift at ') +
      pc.cyan('https://github.com/aliarain/askai/issues')
  );
  console.log(pc.dim('  Built by Ali Arain — ') + pc.cyan('https://aliarain.com'));
  console.log();
}

async function main(): Promise<void> {
  switch (process.argv[2]) {
    case 'init':
      await init();
      break;
    case 'list':
      list();
      break;
    case '-v':
    case '--version':
      console.log(VERSION);
      break;
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      showHelp();
      break;
    default:
      console.log(pc.red('  ✗'), 'Unknown command:', pc.yellow(process.argv[2]));
      console.log('  Run', pc.cyan('npx @raptrx/askai --help'));
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(pc.red('Error:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
