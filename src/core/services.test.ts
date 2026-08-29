import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRegistry,
  getService,
  getServiceIds,
  hasService,
  addService,
  removeService,
  resetServices,
} from './services';

describe('service lookup', () => {
  beforeEach(() => resetServices());

  it('returns a built-in definition', () => {
    const claude = getService('claude');
    expect(claude?.name).toBe('Claude');
    expect(claude?.url).toBe('https://claude.ai/new');
    expect(claude?.param).toBe('q');
  });

  it('is case-insensitive', () => {
    expect(getService('ChatGPT')?.id).toBe('chatgpt');
  });

  it('returns undefined for an unknown id', () => {
    expect(getService('nope')).toBeUndefined();
  });

  it('lists every registered id', () => {
    const ids = getServiceIds();
    expect(ids).toContain('chatgpt');
    expect(ids).toContain('claude');
  });
});

describe('custom services', () => {
  beforeEach(() => resetServices());

  it('registers an internal assistant', () => {
    addService('acme', {
      name: 'Acme AI',
      url: 'https://ai.acme.internal/chat',
      param: 'prompt',
    });
    expect(hasService('acme')).toBe(true);
    expect(getService('acme')?.name).toBe('Acme AI');
  });

  it('accepts the 1.x config shape', () => {
    addService('legacy', {
      name: 'Legacy',
      baseUrl: 'https://legacy.example/chat',
      promptParam: 'query',
    });
    const def = getService('legacy');
    expect(def?.url).toBe('https://legacy.example/chat');
    expect(def?.param).toBe('query');
  });

  it('removes a custom service', () => {
    addService('temp', { name: 'Temp', url: 'https://temp.example', param: 'q' });
    expect(removeService('temp')).toBe(true);
    expect(hasService('temp')).toBe(false);
  });

  it('reports false when removing something that was never added', () => {
    expect(removeService('ghost')).toBe(false);
  });

  it('restores the built-ins on reset', () => {
    addService('temp', { name: 'Temp', url: 'https://temp.example', param: 'q' });
    resetServices();
    expect(hasService('temp')).toBe(false);
    expect(hasService('claude')).toBe(true);
  });
});

describe('createRegistry isolation', () => {
  it('keeps registrations out of the shared registry', () => {
    const scoped = createRegistry();
    scoped.add('tenant-a', {
      name: 'Tenant A',
      url: 'https://a.example/chat',
      param: 'q',
    });

    expect(scoped.has('tenant-a')).toBe(true);
    // The process-wide registry is untouched, so one request cannot leak a
    // destination into another.
    expect(hasService('tenant-a')).toBe(false);
  });

  it('gives each registry its own custom services', () => {
    const a = createRegistry();
    const b = createRegistry();
    a.add('only-a', { name: 'A', url: 'https://a.example', param: 'q' });
    expect(a.has('only-a')).toBe(true);
    expect(b.has('only-a')).toBe(false);
  });

  it('still exposes the built-ins from a scoped registry', () => {
    expect(createRegistry().get('claude')?.name).toBe('Claude');
  });

  it('omits deprecated services from the verified list', () => {
    const ids = createRegistry().verifiedIds();
    expect(ids).not.toContain('gemini');
    expect(ids).not.toContain('copilot');
  });
});
