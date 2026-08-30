import { describe, it, expect } from 'vitest';
import {
  SERVICE_DEFINITIONS,
  VERIFIED_SERVICE_IDS,
  DEFAULT_SERVICE_IDS,
} from './registry';

describe('registry integrity', () => {
  it('has unique ids', () => {
    const ids = SERVICE_DEFINITIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every service a parseable https url', () => {
    for (const s of SERVICE_DEFINITIONS) {
      expect(() => new URL(s.url), s.id).not.toThrow();
      expect(new URL(s.url).protocol, s.id).toBe('https:');
    }
  });

  it('gives every service a non-empty prompt parameter', () => {
    for (const s of SERVICE_DEFINITIONS) {
      expect(s.param.length, s.id).toBeGreaterThan(0);
    }
  });

  it('gives every usable service a positive length budget', () => {
    for (const s of SERVICE_DEFINITIONS.filter((d) => d.tier !== 'deprecated')) {
      expect(s.maxLength, s.id).toBeGreaterThan(0);
    }
  });

  it('records why every deprecated service was retired', () => {
    for (const s of SERVICE_DEFINITIONS.filter((d) => d.tier === 'deprecated')) {
      expect(s.note, s.id).toBeTruthy();
    }
  });

  it('stamps every service with a verification date', () => {
    for (const s of SERVICE_DEFINITIONS) {
      expect(s.verifiedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('excludes experimental and deprecated services from the verified set', () => {
    for (const id of VERIFIED_SERVICE_IDS) {
      const def = SERVICE_DEFINITIONS.find((s) => s.id === id);
      expect(def?.tier, id).toBe('verified');
    }
  });

  it('only defaults to services that are verified', () => {
    for (const id of DEFAULT_SERVICE_IDS) {
      expect(VERIFIED_SERVICE_IDS, id).toContain(id);
    }
  });

  it('keeps the default set small enough to render as a menu', () => {
    expect(DEFAULT_SERVICE_IDS.length).toBeLessThanOrEqual(6);
  });
});

describe('known-bad parameters stay fixed', () => {
  const byId = (id: string) => SERVICE_DEFINITIONS.find((s) => s.id === id)!;

  // Each of these was wrong in 1.x and silently produced a broken button.
  // The assertions exist so a future edit cannot quietly reintroduce them.

  it('sends ChatGPT `prompt`, not `q`', () => {
    expect(byId('chatgpt').param).toBe('prompt');
  });

  it('never sends ChatGPT hints=search, which swallows the prefill', () => {
    expect(byId('chatgpt').extraParams?.hints).toBeUndefined();
  });

  it("honours Claude's documented 14k cap", () => {
    expect(byId('claude').maxLength).toBeLessThanOrEqual(14000);
  });

  it('points Perplexity at /search/new', () => {
    expect(byId('perplexity').url).toContain('/search/new');
  });

  it('sends AI Studio `prompt`, not `q`', () => {
    expect(byId('aistudio').param).toBe('prompt');
  });

  it('keeps Gemini deprecated: it has never supported prefill', () => {
    expect(byId('gemini').tier).toBe('deprecated');
  });

  it('keeps Microsoft Copilot deprecated: prefill was removed in 2025', () => {
    expect(byId('copilot').tier).toBe('deprecated');
  });

  it('sends GitHub Copilot `prompt`; `q` is the parameter that does not work', () => {
    expect(byId('github-copilot').param).toBe('prompt');
  });

  it('marks v0 and Scira as auto-submitting, both confirmed from vendor source', () => {
    expect(byId('v0').autoSubmit).toBe(true);
    expect(byId('scira').autoSubmit).toBe(true);
  });

  it('does not claim AI Studio auto-submits — it fills the composer only', () => {
    expect(byId('aistudio').autoSubmit).toBe(false);
  });
});

describe('evidence is recorded, not implied', () => {
  it('cites a source for every verified service whose parameter was contested', () => {
    for (const id of ['chatgpt', 'claude', 'aistudio', 'github-copilot', 'v0', 'scira']) {
      const def = SERVICE_DEFINITIONS.find((s) => s.id === id)!;
      expect(def.source, `${id} needs its evidence recorded`).toBeTruthy();
    }
  });

  it('never labels an undocumented cap as documented', () => {
    // A cap we invented must not masquerade as one the vendor published.
    for (const s of SERVICE_DEFINITIONS) {
      if (s.capSource === 'documented') {
        expect(s.source ?? s.note, `${s.id} claims a documented cap`).toBeTruthy();
      }
    }
  });
});
