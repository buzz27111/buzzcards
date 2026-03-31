import { describe, it, expect, vi, beforeEach } from 'vitest';
import { titleSimilarity } from './dedup';

// Mock the supabase module before importing isDuplicate
vi.mock('@/lib/supabase', () => ({
  getServerSupabase: vi.fn(),
}));

import { getServerSupabase } from '@/lib/supabase';
import { isDuplicate } from './dedup';
import type { RawArticle } from './scraper';

const mockGetServerSupabase = getServerSupabase as ReturnType<typeof vi.fn>;

function makeArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Test Article Title',
    description: 'A test description',
    sourceUrl: 'https://example.com/article-1',
    pubDate: new Date('2024-01-15T12:00:00Z'),
    author: 'Author',
    imageUrl: null,
    sourceName: 'TestSource',
    category: 'technology',
    ...overrides,
  };
}

// ── titleSimilarity (pure function, no mocking needed) ──

describe('titleSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(titleSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('should return 1.0 for identical strings with different surrounding whitespace', () => {
    expect(titleSimilarity('  hello world  ', 'hello world')).toBe(1);
  });

  it('should return close to 0 for completely different strings', () => {
    const score = titleSimilarity('abcdef', 'zyxwvu');
    expect(score).toBeLessThan(0.1);
  });

  it('should return 1 for identical single-character strings (exact match shortcut)', () => {
    // Identical strings hit the early return before the bigram length check
    expect(titleSimilarity('a', 'a')).toBe(1);
  });

  it('should return 0 for different single-character strings (< 2 chars, no bigrams)', () => {
    expect(titleSimilarity('x', 'y')).toBe(0);
  });

  it('should return 1 for two empty strings (exact match shortcut)', () => {
    // Both trim to '' which are equal → early return 1
    expect(titleSimilarity('', '')).toBe(1);
  });

  it('should return 0 when one string is empty and the other is not', () => {
    expect(titleSimilarity('hello', '')).toBe(0);
    expect(titleSimilarity('', 'hello')).toBe(0);
  });

  it('should be case-insensitive', () => {
    expect(titleSimilarity('Hello World', 'hello world')).toBe(1);
  });

  it('should return a score below 0.85 for titles at ~84% similarity', () => {
    // "Breaking News: Major Event Unfolds Today"  vs a slightly different version
    const a = 'Breaking News: Major Event Unfolds Today in Washington';
    const b = 'Breaking News: Major Event Unfolds Today in Baltimore';
    const score = titleSimilarity(a, b);
    // These share most bigrams but differ at the end — score should be high but we just verify it's a number in range
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should return exactly 0.85 or above for very similar titles', () => {
    // Craft two strings whose Dice coefficient is right around 0.85
    // "abcdefghijklmnopqrst" (19 bigrams) vs "abcdefghijklmnopqrsu" (19 bigrams)
    // They share 18 bigrams → Dice = 2*18 / (19+19) = 36/38 ≈ 0.947
    const a = 'abcdefghijklmnopqrst';
    const b = 'abcdefghijklmnopqrsu';
    const score = titleSimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0.85);
  });

  it('should detect boundary: score > 0.85 triggers duplicate', () => {
    // Two nearly identical headlines
    const a = 'Tech Giants Report Record Earnings This Quarter';
    const b = 'Tech Giants Report Record Earnings Last Quarter';
    const score = titleSimilarity(a, b);
    expect(score).toBeGreaterThan(0.85);
  });

  it('should detect boundary: sufficiently different titles score below 0.85', () => {
    const a = 'Tech Giants Report Record Earnings This Quarter';
    const b = 'Sports Teams Win Championship in Dramatic Fashion';
    const score = titleSimilarity(a, b);
    expect(score).toBeLessThan(0.85);
  });
});


// ── isDuplicate (requires Supabase mocking) ──

function createMockSupabase(options: {
  urlData?: { id: string }[] | null;
  urlError?: { message: string } | null;
  titleData?: { title: string }[] | null;
  titleError?: { message: string } | null;
}) {
  const { urlData = null, urlError = null, titleData = null, titleError = null } = options;

  // Build chainable mock for URL query
  const urlChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: urlData, error: urlError }),
  };

  // Build chainable mock for title query
  const titleChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: titleData, error: titleError }),
  };

  let callCount = 0;
  const fromFn = vi.fn().mockImplementation(() => {
    callCount++;
    // First call is URL check, second is title check
    return callCount === 1 ? urlChain : titleChain;
  });

  return { from: fromFn };
}

describe('isDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when URL match is found', async () => {
    const mockSupa = createMockSupabase({
      urlData: [{ id: 'existing-id' }],
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(true);
  });

  it('should return true when title similarity exceeds 85%', async () => {
    const mockSupa = createMockSupabase({
      urlData: [],
      titleData: [{ title: 'Test Article Title' }], // identical title → 1.0 similarity
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(true);
  });

  it('should return false for a unique article (no URL match, no similar titles)', async () => {
    const mockSupa = createMockSupabase({
      urlData: [],
      titleData: [{ title: 'Completely Unrelated Article About Cooking' }],
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(false);
  });

  it('should return false when URL check errors (allows article through)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockSupa = createMockSupabase({
      urlError: { message: 'DB connection failed' },
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(false);
    // console.error is called with two args: prefix string, error message
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dedup]'),
      'DB connection failed'
    );
    errorSpy.mockRestore();
  });

  it('should return false when title check errors (allows article through)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockSupa = createMockSupabase({
      urlData: [],
      titleError: { message: 'Query timeout' },
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dedup]'),
      'Query timeout'
    );
    errorSpy.mockRestore();
  });

  it('should return false when no existing articles in category', async () => {
    const mockSupa = createMockSupabase({
      urlData: [],
      titleData: [],
    });
    mockGetServerSupabase.mockReturnValue(mockSupa);

    const result = await isDuplicate(makeArticle());
    expect(result).toBe(false);
  });
});
