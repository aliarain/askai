import { describe, it, expect } from 'vitest';
import {
  buildPrompt,
  createAiPrompt,
  createAiPrompts,
  validateUrl,
  looksLikeCode,
} from './builder';
import { VERIFIED_SERVICE_IDS } from './registry';

const GOAL = 'Explain this';
const CODE = 'const x = 1;';

describe('createAiPrompt', () => {
  it('puts the whole prompt in the destination parameter', () => {
    const url = new URL(createAiPrompt(GOAL, 'hello world', 'chatgpt'));
    expect(url.origin).toBe('https://chatgpt.com');
    expect(url.searchParams.get('prompt')).toBe('Explain this\n\nhello world');
  });

  it('fences content that looks like code', () => {
    const url = new URL(createAiPrompt(GOAL, CODE, 'claude'));
    expect(url.searchParams.get('q')).toBe('Explain this\n\n```\nconst x = 1;\n```');
  });

  it('leaves prose unfenced', () => {
    const url = new URL(createAiPrompt(GOAL, 'Just a sentence.', 'claude'));
    expect(url.searchParams.get('q')).toBe('Explain this\n\nJust a sentence.');
  });

  it('uses the language hint when given structured content', () => {
    const url = new URL(
      createAiPrompt(GOAL, { text: 'print(1)', language: 'python' }, 'claude')
    );
    expect(url.searchParams.get('q')).toContain('```python\nprint(1)\n```');
  });

  it('serializes arbitrary objects as json', () => {
    const url = new URL(createAiPrompt(GOAL, { a: 1 }, 'claude'));
    expect(url.searchParams.get('q')).toContain('```json');
    expect(url.searchParams.get('q')).toContain('"a": 1');
  });

  it('lengthens the fence so content containing a fence cannot escape it', () => {
    const content = 'const a = 1;\n```\nnested\n```';
    const q = new URL(createAiPrompt(GOAL, content, 'claude')).searchParams.get('q')!;
    expect(q).toContain('````');
  });

  it('rejects an unknown service by name', () => {
    expect(() => createAiPrompt(GOAL, CODE, 'nope')).toThrow(/Unknown AI service/);
  });

  it('refuses a deprecated service rather than opening an empty chat', () => {
    expect(() => createAiPrompt(GOAL, CODE, 'gemini')).toThrow(/no longer supports/);
    expect(() => createAiPrompt(GOAL, CODE, 'copilot')).toThrow(/no longer supports/);
  });
});

describe('extra parameters', () => {
  it("emits the destination's own required parameters", () => {
    const url = new URL(createAiPrompt(GOAL, 'hi', 'duckai'));
    expect(url.searchParams.get('bang')).toBe('true');
    expect(url.searchParams.get('prompt')).toBe('1');
    expect(url.searchParams.get('q')).toContain('Explain this');
  });

  it('appends caller-supplied parameters without corrupting the query string', () => {
    const url = new URL(createAiPrompt(GOAL, 'hi', 'claude', { params: { ref: 'docs' } }));
    expect(url.searchParams.get('ref')).toBe('docs');
    expect(url.searchParams.get('q')).toContain('Explain this');
  });
});

describe('overflow handling', () => {
  it('truncates to the cap and reports how much was dropped', () => {
    const long = 'x'.repeat(50_000);
    const result = buildPrompt(GOAL, long, 'claude');
    expect(result.truncated).toBe(true);
    expect(result.droppedChars).toBeGreaterThan(0);
    const q = new URL(result.url).searchParams.get('q')!;
    expect(q.length).toBeLessThanOrEqual(14000);
  });

  it('never reports truncation when the content fits', () => {
    const result = buildPrompt(GOAL, 'short', 'claude');
    expect(result.truncated).toBe(false);
    expect(result.droppedChars).toBe(0);
  });

  it('throws instead of truncating when asked to', () => {
    expect(() =>
      buildPrompt(GOAL, 'x'.repeat(50_000), 'claude', { onOverflow: 'error' })
    ).toThrow(/accepts 14000/);
  });

  it('keeps every destination inside its own cap', () => {
    const long = 'y'.repeat(100_000);
    for (const id of VERIFIED_SERVICE_IDS) {
      const result = buildPrompt(GOAL, long, id);
      const value = new URL(result.url).searchParams.get(
        id === 'kimi' ? 'prefill_prompt' : id === 'qwen' || id === 'cursor' ? 'text' : id === 'chatgpt' ? 'prompt' : 'q'
      )!;
      expect(value.length, id).toBeLessThanOrEqual(
        // maxLength is the budget for the assembled prompt
        20000
      );
      expect(result.truncated, id).toBe(true);
    }
  });
});

describe('createAiPrompts', () => {
  it('returns the small default set, not everything', () => {
    const results = createAiPrompts(GOAL, CODE);
    expect(results.length).toBeLessThanOrEqual(6);
    expect(results.map((r) => r.service)).toContain('chatgpt');
  });

  it("resolves 'all' to the verified tier only", () => {
    const results = createAiPrompts(GOAL, CODE, 'all');
    expect(results.map((r) => r.service)).toEqual([...VERIFIED_SERVICE_IDS]);
    expect(results.map((r) => r.service)).not.toContain('gemini');
    expect(results.map((r) => r.service)).not.toContain('aistudio');
  });

  it('reports whether each destination will actually run the prompt', () => {
    const [chatgpt] = createAiPrompts(GOAL, CODE, ['chatgpt']);
    const [perplexity] = createAiPrompts(GOAL, CODE, ['perplexity']);
    expect(chatgpt.autoSubmit).toBe(false);
    expect(perplexity.autoSubmit).toBe(true);
  });
});

describe('validateUrl', () => {
  it('accepts a url on the service origin', () => {
    expect(validateUrl('chatgpt', createAiPrompt(GOAL, CODE, 'chatgpt'))).toBe(true);
  });

  it('rejects a url on another origin', () => {
    expect(validateUrl('chatgpt', 'https://evil.example/?prompt=hi')).toBe(false);
  });

  it('rejects a malformed url', () => {
    expect(validateUrl('chatgpt', 'not a url')).toBe(false);
  });
});

describe('looksLikeCode', () => {
  it.each([
    ['import x from "y"', true],
    ['const add = (a, b) => a + b', true],
    ['def main():\n    pass', true],
    ['<Button onClick={x} />', true],
    ['function f() {', true],
    ['Just an ordinary sentence about things.', false],
    ['Is 5 < 10 and 20 > 3 correct?', false],
    ['', false],
  ])('classifies %j as code=%s', (input, expected) => {
    expect(looksLikeCode(input as string)).toBe(expected);
  });
});
