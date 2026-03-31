import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

// --- Supabase mock helpers ---

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

function createChain(finalValue: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
    single: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
    maybeSingle: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
  };
  chain.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return chain;
}

let hotTakesChain: MockChain;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => hotTakesChain,
  }),
}));

import { GET, POST, containsProfanity } from './route';

describe('containsProfanity', () => {
  it('detects profane words', () => {
    expect(containsProfanity('this is shit')).toBe(true);
    expect(containsProfanity('What the fuck')).toBe(true);
  });

  it('passes clean text', () => {
    expect(containsProfanity('This is a great article')).toBe(false);
    expect(containsProfanity('Interesting perspective on the topic')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(containsProfanity('SHIT')).toBe(true);
    expect(containsProfanity('Fuck')).toBe(true);
  });

  it('does not flag partial word matches', () => {
    // "class" contains "ass" but should not be flagged since we split on word boundaries
    expect(containsProfanity('class assignment')).toBe(false);
    expect(containsProfanity('assume nothing')).toBe(false);
  });

  it('detects profanity mixed with clean words', () => {
    expect(containsProfanity('I think this is total bullshit honestly')).toBe(true);
    expect(containsProfanity('great article but damn the ending')).toBe(true);
  });

  it('detects profanity surrounded by punctuation', () => {
    expect(containsProfanity('what the hell!')).toBe(true);
    expect(containsProfanity('(shit)')).toBe(true);
    expect(containsProfanity('wow...fuck...really?')).toBe(true);
  });

  it('handles empty and whitespace-only text', () => {
    expect(containsProfanity('')).toBe(false);
    expect(containsProfanity('   ')).toBe(false);
  });

  it('detects multiple profane words in same text', () => {
    expect(containsProfanity('shit and fuck')).toBe(true);
  });
});

describe('POST /api/hot-takes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePostRequest(body: Record<string, unknown>) {
    return new Request('https://localhost/api/hot-takes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 for invalid JSON', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(
      new Request('https://localhost/api/hot-takes', { method: 'POST', body: 'not json' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/);
  });

  it('returns 400 for missing fields', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(makePostRequest({ articleId: 'abc' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 400 for text exceeding 140 characters', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const longText = 'a'.repeat(141);
    const res = await POST(
      makePostRequest({ articleId: 'abc', text: longText, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/140 characters/);
  });

  it('returns 400 for profane content with content guidelines message', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(
      makePostRequest({ articleId: 'abc', text: 'this is shit', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/content guidelines/);
  });

  it('creates a hot take successfully', async () => {
    const mockRow = {
      id: 'ht-1',
      article_id: 'abc',
      text: 'Great article!',
      upvotes: 0,
      created_at: '2024-01-01T00:00:00Z',
    };
    hotTakesChain = createChain({ data: mockRow, error: null });

    const res = await POST(
      makePostRequest({ articleId: 'abc', text: 'Great article!', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.hotTake).toEqual({
      id: 'ht-1',
      articleId: 'abc',
      text: 'Great article!',
      upvotes: 0,
      createdAt: '2024-01-01T00:00:00Z',
    });
  });

  it('allows text at exactly 140 characters', async () => {
    const exactText = 'a'.repeat(140);
    const mockRow = {
      id: 'ht-2',
      article_id: 'abc',
      text: exactText,
      upvotes: 0,
      created_at: '2024-01-01T00:00:00Z',
    };
    hotTakesChain = createChain({ data: mockRow, error: null });

    const res = await POST(
      makePostRequest({ articleId: 'abc', text: exactText, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(201);
  });

  it('allows text at 139 characters', async () => {
    const shortText = 'a'.repeat(139);
    const mockRow = {
      id: 'ht-3',
      article_id: 'abc',
      text: shortText,
      upvotes: 0,
      created_at: '2024-01-01T00:00:00Z',
    };
    hotTakesChain = createChain({ data: mockRow, error: null });

    const res = await POST(
      makePostRequest({ articleId: 'abc', text: shortText, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(201);
  });

  it('rejects empty string as missing field', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(
      makePostRequest({ articleId: 'abc', text: '', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 500 when supabase insert fails', async () => {
    hotTakesChain = createChain({ data: null, error: { message: 'DB error' } });

    const res = await POST(
      makePostRequest({ articleId: 'abc', text: 'Valid take', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

describe('GET /api/hot-takes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when articleId is missing', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await GET(new Request('https://localhost/api/hot-takes'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/articleId/);
  });

  it('returns top 3 hot takes for an article', async () => {
    const mockRows = [
      { id: 'ht-1', article_id: 'abc', text: 'Take 1', upvotes: 10, created_at: '2024-01-01T00:00:00Z' },
      { id: 'ht-2', article_id: 'abc', text: 'Take 2', upvotes: 5, created_at: '2024-01-01T01:00:00Z' },
      { id: 'ht-3', article_id: 'abc', text: 'Take 3', upvotes: 3, created_at: '2024-01-01T02:00:00Z' },
    ];
    hotTakesChain = createChain({ data: mockRows, error: null });

    const res = await GET(new Request('https://localhost/api/hot-takes?articleId=abc'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hotTakes).toHaveLength(3);
    expect(body.hotTakes[0].upvotes).toBe(10);
    expect(body.hotTakes[0].articleId).toBe('abc');
  });

  it('returns empty array when no hot takes exist', async () => {
    hotTakesChain = createChain({ data: [], error: null });
    const res = await GET(new Request('https://localhost/api/hot-takes?articleId=abc'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hotTakes).toEqual([]);
  });
});
