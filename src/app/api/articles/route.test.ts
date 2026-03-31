import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

// Chainable query builder mock
function createQueryMock(resolvedData: unknown[] | null, resolvedError: { message: string } | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // Make it thenable so `await query` resolves
  (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) =>
    resolve({ data: resolvedData, error: resolvedError });
  return chain;
}

let queryMock: ReturnType<typeof createQueryMock>;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => queryMock,
  }),
}));

import { GET } from './route';

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

describe('GET /api/articles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns articles with default pagination', async () => {
    const rows = [makeRow()];
    queryMock = createQueryMock(rows);

    const response = await GET(new Request('https://localhost/api/articles'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.articles).toHaveLength(1);
    expect(body.hasMore).toBe(false);
    expect(queryMock.select).toHaveBeenCalledWith('*');
    expect(queryMock.order).toHaveBeenCalledWith('pub_date', { ascending: false });
    expect(queryMock.range).toHaveBeenCalledWith(0, 20); // offset 0, limit+1=20 → range(0,20)
  });

  it('maps snake_case DB columns to camelCase Article fields', async () => {
    queryMock = createQueryMock([makeRow()]);

    const response = await GET(new Request('https://localhost/api/articles'));
    const body = await response.json();
    const article = body.articles[0];

    expect(article.sourceUrl).toBe('https://example.com/1');
    expect(article.pubDate).toBe('2024-06-01T00:00:00Z');
    expect(article.imageUrl).toBe('https://example.com/img.jpg');
    expect(article.sourceName).toBe('TechCrunch');
    expect(article.geoLocation).toBeNull();
    expect(article.shareCount).toBe(10);
    expect(article.fetchTimestamp).toBe('2024-06-01T00:00:00Z');
    expect(article.reactions).toEqual({
      fire: 5,
      heart: 3,
      mindblown: 1,
      sad: 0,
      angry: 2,
    });
  });

  it('sets Cache-Control header', async () => {
    queryMock = createQueryMock([]);

    const response = await GET(new Request('https://localhost/api/articles'));

    expect(response.headers.get('Cache-Control')).toBe(
      's-maxage=60, stale-while-revalidate=300'
    );
  });

  it('filters by category when provided', async () => {
    queryMock = createQueryMock([]);

    await GET(new Request('https://localhost/api/articles?category=science'));

    expect(queryMock.eq).toHaveBeenCalledWith('category', 'science');
  });

  it('does not filter by category when not provided', async () => {
    queryMock = createQueryMock([]);

    await GET(new Request('https://localhost/api/articles'));

    expect(queryMock.eq).not.toHaveBeenCalled();
  });

  it('respects page and limit params', async () => {
    queryMock = createQueryMock([]);

    await GET(new Request('https://localhost/api/articles?page=3&limit=10'));

    // offset = (3-1)*10 = 20, range(20, 30) for limit+1
    expect(queryMock.range).toHaveBeenCalledWith(20, 30);
  });

  it('returns hasMore=true when more rows than limit', async () => {
    // 21 rows returned means hasMore=true for limit=20
    const rows = Array.from({ length: 21 }, (_, i) =>
      makeRow({ id: `uuid-${i}`, source_url: `https://example.com/${i}` })
    );
    queryMock = createQueryMock(rows);

    const response = await GET(new Request('https://localhost/api/articles'));
    const body = await response.json();

    expect(body.hasMore).toBe(true);
    expect(body.articles).toHaveLength(20);
  });

  it('returns 500 on Supabase error', async () => {
    queryMock = createQueryMock(null, { message: 'DB connection failed' });

    const response = await GET(new Request('https://localhost/api/articles'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('clamps page to minimum of 1', async () => {
    queryMock = createQueryMock([]);

    await GET(new Request('https://localhost/api/articles?page=-5'));

    expect(queryMock.range).toHaveBeenCalledWith(0, 20);
  });

  it('clamps limit to minimum of 1', async () => {
    queryMock = createQueryMock([]);

    await GET(new Request('https://localhost/api/articles?limit=0'));

    // limit clamped to 1, offset=0, range(0, 1)
    expect(queryMock.range).toHaveBeenCalledWith(0, 20);
  });
});
