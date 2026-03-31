import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';

// Mock modules that fallbackSummary's parent module imports at the top level
vi.mock('@/lib/env', () => ({
  getEnv: () => ({}),
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  InvokeModelCommand: vi.fn(),
  BedrockRuntimeClient: class { send = vi.fn(); },
}));

import { fallbackSummary } from './summarizer';

/**
 * **Validates: Requirements 4.4**
 *
 * Property 2: Summary storage and retrieval round-trip
 * For all article descriptions, generating a fallback summary then
 * "storing" and "retrieving" it (simulated as re-applying fallbackSummary)
 * produces equivalent text. This verifies idempotency, word-count bounds,
 * and preservation of short inputs.
 */

// Arbitrary for printable strings of varying length (including whitespace-heavy inputs)
const arbDescription = fc.string({ minLength: 0, maxLength: 500 });

// Arbitrary for multi-word text with normal spacing
const arbWords = fc
  .array(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0 && !/\s/.test(s)), {
    minLength: 0,
    maxLength: 120,
  })
  .map((words) => words.join(' '));

// Arbitrary for short text guaranteed to be ≤60 words (no whitespace-only tokens)
const arbShortText = fc
  .array(fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.trim().length > 0 && !/\s/.test(s)), {
    minLength: 1,
    maxLength: 60,
  })
  .map((words) => words.join(' '));

// Helper: count words the same way fallbackSummary does
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe('fallbackSummary property tests', () => {
  it('Property 2a: fallbackSummary is idempotent — applying it twice equals applying it once', () => {
    fc.assert(
      fc.property(arbDescription, (description) => {
        const once = fallbackSummary(description);
        const twice = fallbackSummary(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 2b: fallbackSummary output always has ≤60 words', () => {
    fc.assert(
      fc.property(arbWords, (description) => {
        const summary = fallbackSummary(description);
        expect(wordCount(summary.replace(/\.\.\.$/, '').trim())).toBeLessThanOrEqual(60);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 2c: fallbackSummary preserves text when input is ≤60 words (after whitespace normalization)', () => {
    fc.assert(
      fc.property(arbShortText, (description) => {
        const normalized = description.split(/\s+/).filter(Boolean).join(' ');
        const summary = fallbackSummary(description);
        expect(summary).toBe(normalized);
        expect(summary.endsWith('...')).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});
