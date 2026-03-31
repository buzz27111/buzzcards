import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

// Inline Dice coefficient for test — mirrors the real titleSimilarity
function testTitleSimilarity(a: string, b: string): number {
  const trimA = a.trim();
  const trimB = b.trim();
  if (trimA === trimB) return 1;
  if (trimA.length < 2 || trimB.length < 2) return 0;
  const bigrams = (s: string) => {
    const low = s.toLowerCase();
    const r: string[] = [];
    for (let i = 0; i < low.length - 1; i++) r.push(low.slice(i, i + 2));
    return r;
  };
  const bA = bigrams(trimA);
  const bB = bigrams(trimB);
  const setB = new Map<string, number>();
  for (const bg of bB) setB.set(bg, (setB.get(bg) ?? 0) + 1);
  let matches = 0;
  for (const bg of bA) {
    const c = setB.get(bg);
    if (c && c > 0) { matches++; setB.set(bg, c - 1); }
  }
  return (2 * matches) / (bA.length + bB.length);
}

vi.mock('@/lib/scraper/dedup', () => ({
  titleSimilarity: (a: string, b: string) => testTitleSimilarity(a, b),
  isDuplicate: vi.fn(),
}));

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'uuid-1',
    title: 'Test Article',
    description: 'A description',
    summary: 'A summary',
    source_url: 'https://example.com/1',
    pub_date: '2024-06-01T00:00:00Z',
    author: 'Author',
    image_url: 'https://example.com/img.jpg',
    category: 'technology',
    source_name: 'TechCrunch',
    geo_location: null,
    reaction_fire: 5,
    reaction_heart: 3,
    reaction_mindblown: 1,
    reaction_sad: 0,
    reaction_angry: 2,
    share_count: 10,
    fetch_timestamp: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

let callCount: number;
let sourceResult: { data: unknown; error: { message: string } | null };
let candidatesResult: { data: unknown[] | null; error: { message: string } | null };

function createFromMock() {
  callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      // First call: source article fetch — select('*').eq('id', ...).single()
      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => {
          const thenable: Record<string, unknown> = {};
          thenable.then = (resolve: (v: unknown) => void) =>
            resolve(sourceResult);
          return thenable;
        }),
      };
      return chain;
    }
    // Second call: candidates query — select('*').neq(...).order(...).limit(...)
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };
    chain.then = (resolve: (v: unknown) => void) =>
      resolve(candidatesResult);
    return chain;
  };
}

let fromMock: ReturnType<typeof createFromMock>;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => fromMock(),
  }),
}));

import { GET } from './route';

describe('GET /api/articles/compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock = createFromMock();
  });

  it('returns 400 when articleId is missing', async () => {
    const response = await GET(new Request('https://localhost/api/articles/compare'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('articleId query parameter is required');
  });

  it('returns 404 when source article not found', async () => {
    sourceResult = { data: null, error: { message: 'Not found' } };
    candidatesResult = { data: [], error: null };

    const response = await GET(
      new Request('https://localhost/api/articles/compare?articleId=uuid-1')
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Article not found');
  });

  it('returns 404 when no matching article found', async () => {
    sourceResult = {
      data: makeRow({ title: 'Unique Title About Nothing' }),
      error: null,
    };
    candidatesResult = {
      data: [
        makeRow({
          id: 'uuid-2',
          title: 'Completely Different Topic',
          source_name: 'BBC News',
        }),
      ],
      error: null,
    };

    const response = await GET(
      new Request('https://localhost/api/articles/compare?articleId=uuid-1')
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('No matching article found from a different source');
  });

  it('returns article and comparison when match found', async () => {
    // Use very similar titles to ensure ≥70% similarity
    sourceResult = {
      data: makeRow({ title: 'Breaking News: Major Tech Company Announces New Product Launch' }),
      error: null,
    };
    candidatesResult = {
      data: [
        makeRow({
          id: 'uuid-2',
          title: 'Breaking News: Major Tech Company Announces New Product Launch Today',
          source_name: 'BBC News',
          source_url: 'https://bbc.com/1',
        }),
      ],
      error: null,
    };

    const response = await GET(
      new Request('https://localhost/api/articles/compare?articleId=uuid-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.article).toBeDefined();
    expect(body.comparison).toBeDefined();
    expect(body.comparison.sourceName).toBe('BBC News');
  });

  it('returns 500 on Supabase error fetching candidates', async () => {
    sourceResult = { data: makeRow(), error: null };
    candidatesResult = { data: null, error: { message: 'DB error' } };

    const response = await GET(
      new Request('https://localhost/api/articles/compare?articleId=uuid-1')
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('DB error');
  });

  it('maps DB columns to camelCase in both article and comparison', async () => {
    sourceResult = {
      data: makeRow({ title: 'Breaking News: Major Tech Company Announces New Product Launch' }),
      error: null,
    };
    candidatesResult = {
      data: [
        makeRow({
          id: 'uuid-2',
          title: 'Breaking News: Major Tech Company Announces New Product Launch Today',
          source_name: 'BBC News',
          source_url: 'https://bbc.com/1',
          image_url: 'https://bbc.com/img.jpg',
        }),
      ],
      error: null,
    };

    const response = await GET(
      new Request('https://localhost/api/articles/compare?articleId=uuid-1')
    );
    const body = await response.json();

    expect(body.article.sourceUrl).toBe('https://example.com/1');
    expect(body.article.sourceName).toBe('TechCrunch');
    expect(body.comparison.sourceUrl).toBe('https://bbc.com/1');
    expect(body.comparison.imageUrl).toBe('https://bbc.com/img.jpg');
  });
});
