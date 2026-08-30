/**
 * Probe every destination and report where the registry has drifted.
 *
 * Deep-link parameters are undocumented and change without notice, so a
 * catalogue this size cannot be kept honest by hand. This runs weekly in CI and
 * opens an issue when something moves.
 *
 * What it can check from a server:
 *   - the base URL still resolves, and to the host we expect
 *   - the length at which the edge starts rejecting the request (414/431),
 *     compared against the cap we advertise
 *
 * What it cannot check: whether the prompt actually lands in the composer.
 * That is client-side behaviour behind a login wall on most of these, and no
 * amount of HTTP probing substitutes for opening the page. Findings are
 * reported as leads, never as proof, and the script never rewrites the
 * registry on its own.
 *
 * Exit code is 0 unless --strict is passed, because a vendor's bot protection
 * blocking a runner is not a regression in this package.
 *
 * Run: npm run verify:destinations
 */
import { SERVICE_DEFINITIONS } from '../dist/index.mjs';

const STRICT = process.argv.includes('--strict');
const TIMEOUT_MS = 15_000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/** A request that gives up rather than hanging the job. */
async function probe(url, method = 'GET') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
    });
    return { status: res.status, url: res.url };
  } catch (err) {
    return { status: 0, error: err instanceof Error ? err.name : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

const TOO_LONG = new Set([413, 414, 431]);

/** Binary-search the payload length at which the edge starts refusing. */
async function findLimit(def, lo = 1000, hi = 40000) {
  const build = (n) => {
    const u = new URL(def.url);
    for (const [k, v] of Object.entries(def.extraParams ?? {})) u.searchParams.set(k, v);
    u.searchParams.set(def.param, 'x'.repeat(n));
    return u.toString();
  };

  const high = await probe(build(hi));
  // Nothing to bisect: either it accepts everything we would ever send, or the
  // host is refusing us for an unrelated reason.
  if (!TOO_LONG.has(high.status)) return { limit: null, note: `no 414 at ${hi}`, status: high.status };

  const low = await probe(build(lo));
  if (TOO_LONG.has(low.status)) return { limit: lo, note: `rejects even ${lo}`, status: low.status };

  while (hi - lo > 250) {
    const mid = Math.floor((lo + hi) / 2);
    const res = await probe(build(mid));
    if (TOO_LONG.has(res.status)) hi = mid;
    else lo = mid;
  }
  return { limit: lo, note: `edge refuses above ~${lo}`, status: high.status };
}

const findings = [];
const rows = [];

for (const def of SERVICE_DEFINITIONS) {
  if (def.tier === 'deprecated') continue;

  const base = await probe(def.url, 'HEAD');
  const reachable = base.status > 0 && base.status < 400;
  let limitInfo = { limit: null, note: 'skipped' };

  if (reachable || base.status === 405) {
    limitInfo = await findLimit(def);
  }

  const expectedHost = new URL(def.url).host;
  const landedHost = base.url ? new URL(base.url).host : null;

  if (base.status === 0) {
    findings.push({
      id: def.id,
      level: 'info',
      msg: `unreachable from CI (${base.error}) — usually bot protection, not a regression`,
    });
  } else if (base.status >= 400 && base.status !== 405) {
    findings.push({ id: def.id, level: 'warn', msg: `base URL returned ${base.status}` });
  }

  if (landedHost && landedHost !== expectedHost) {
    findings.push({
      id: def.id,
      level: 'warn',
      msg: `redirects to ${landedHost}, registry says ${expectedHost}`,
    });
  }

  if (limitInfo.limit !== null && def.maxLength > limitInfo.limit) {
    findings.push({
      id: def.id,
      level: 'error',
      msg:
        `advertises ${def.maxLength} but the edge refuses above ~${limitInfo.limit}. ` +
        `Prompts between those numbers fail before the app sees them.`,
    });
  }

  rows.push({
    service: def.id,
    base: base.status || 'blocked',
    cap: def.maxLength,
    measured: limitInfo.limit ?? '—',
    source: def.capSource ?? 'assumed',
  });
}

console.table(rows);

if (!findings.length) {
  console.log('\nNo drift detected.');
  process.exit(0);
}

console.log('\nFindings\n');
for (const f of findings) {
  console.log(`  [${f.level}] ${f.id}: ${f.msg}`);
}

const errors = findings.filter((f) => f.level === 'error');
console.log(
  `\n${errors.length} error(s), ${findings.length - errors.length} advisory. ` +
    'Advisories are usually a vendor blocking the runner, not a package regression.'
);

process.exit(STRICT && errors.length ? 1 : 0);
