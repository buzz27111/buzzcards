import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
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

// We need a more flexible mock that supports two chained queries (ids then full article)
let callCount: number;
let idQueryResult: { data: unknown[] | null; error: { message: string } | null };
let articleQueryResult: { data: unknown; error: { message: string } | null };

function createFromMock() {
  callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      // First call: select('id') query
      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
      };
      chain.then = (resolve: (v: unknown) => void) =>
        resolve(idQueryResult);
      return chain;
    }
    // Second call: select('*').eq('id', ...).single()
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        const thenable: Record<string, unknown> = {};
        thenable.then = (resolve: (v: unknown) => void) =>
          resolve(articleQueryResult);
        return thenable;
      }),
    };
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

describe('GET /api/articles/random', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock = createFromMock();
  });

  it('returns a random article', async () => {
    const row = makeRow();
    idQueryResult = { data: [{ id: 'uuid-1' }], error: null };
    articleQueryResult = { data: row, error: null };

    const response = await GET(new Request('https://localhost/api/articles/random'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.article).toBeDefined();
    expect(body.article.id).toBe('uuid-1');
    expect(body.article.sourceUrl).toBe('https://example.com/1');
    expect(body.article.reactions).toEqual({
      fire: 5, heart: 3, mindblown: 1, sad: 0, angry: 2,
    });
  });

  it('returns 404 when no articles available', async () => {
    idQueryResult = { data: [], error: null };
    articleQueryResult = { data: null, error: null };

    const response = await GET(new Request('https://localhost/api/articles/random'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('No articles available');
  });

  it('returns 500 on Supabase error fetching IDs', async () => {
    idQueryResult = { data: null, error: { message: 'DB error' } };
    articleQueryResult = { data: null, error: null };

    const response = await GET(new Request('https://localhost/api/articles/random'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('DB error');
  });

  it('returns 404 when full article fetch fails', async () => {
    idQueryResult = { data: [{ id: 'uuid-1' }], error: null };
    articleQueryResult = { data: null, error: { message: 'Not found' } };

    const response = await GET(new Request('https://localhost/api/articles/random'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Article not found');
  });

  it('maps DB columns to camelCase', async () => {
    idQueryResult = { data: [{ id: 'uuid-1' }], error: null };
    articleQueryResult = { data: makeRow(), error: null };

    const response = await GET(new Request('https://localhost/api/articles/random'));
    const body = await response.json();
    const a = body.article;

    expect(a.sourceName).toBe('TechCrunch');
    expect(a.pubDate).toBe('2024-06-01T00:00:00Z');
    expect(a.imageUrl).toBe('https://example.com/img.jpg');
    expect(a.shareCount).toBe(10);
    expect(a.fetchTimestamp).toBe('2024-06-01T00:00:00Z');
  });
});
