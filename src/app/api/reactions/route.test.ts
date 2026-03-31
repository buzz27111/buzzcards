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
  delete: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

function createChain(finalValue: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
    single: vi.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve(finalValue),
    }),
  };
  // Default thenable for awaiting the chain directly
  chain.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return chain;
}

// We need different chains for different tables
let reactionsChain: MockChain;
let articlesChain: MockChain;
let rpcResult: { data: unknown; error: unknown };

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === 'reactions') return reactionsChain;
      if (table === 'articles') return articlesChain;
      return createChain({ data: null, error: null });
    },
    rpc: () => ({
      then: (resolve: (v: unknown) => void) => resolve(rpcResult),
    }),
  }),
}));

import { GET, POST } from './route';

const ARTICLE_ROW = {
  reaction_fire: 5,
  reaction_heart: 3,
  reaction_mindblown: 1,
  reaction_sad: 0,
  reaction_angry: 2,
};

describe('GET /api/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when articleId is missing', async () => {
    articlesChain = createChain({ data: null, error: null });
    reactionsChain = createChain({ data: null, error: null });

    const res = await GET(new Request('https://localhost/api/reactions'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/articleId/);
  });

  it('returns reaction counts and empty userReactions when no fingerprint', async () => {
    articlesChain = createChain({ data: ARTICLE_ROW, error: null });
    reactionsChain = createChain({ data: [], error: null });

    const res = await GET(new Request('https://localhost/api/reactions?articleId=abc'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactions).toEqual({
      fire: 5, heart: 3, mindblown: 1, sad: 0, angry: 2,
    });
    expect(body.userReactions).toEqual([]);
  });

  it('returns userReactions when fingerprint is provided', async () => {
    articlesChain = createChain({ data: ARTICLE_ROW, error: null });
    reactionsChain = createChain({
      data: [{ emoji: 'fire' }, { emoji: 'sad' }],
      error: null,
    });

    const res = await GET(
      new Request('https://localhost/api/reactions?articleId=abc&fingerprint=fp1')
    );
    const body = await res.json();
    expect(body.userReactions).toEqual(['fire', 'sad']);
  });

  it('returns 404 when article not found', async () => {
    articlesChain = createChain({ data: null, error: { message: 'not found' } });
    reactionsChain = createChain({ data: [], error: null });

    const res = await GET(new Request('https://localhost/api/reactions?articleId=missing'));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcResult = { data: null, error: null };
  });

  function makePostRequest(body: Record<string, unknown>) {
    return new Request('https://localhost/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 for missing fields', async () => {
    reactionsChain = createChain({ data: null, error: null });
    articlesChain = createChain({ data: ARTICLE_ROW, error: null });

    const res = await POST(makePostRequest({ articleId: 'abc' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 400 for invalid emoji', async () => {
    reactionsChain = createChain({ data: null, error: null });
    articlesChain = createChain({ data: ARTICLE_ROW, error: null });

    const res = await POST(
      makePostRequest({ articleId: 'abc', emoji: 'laugh', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid emoji/);
  });

  it('adds a new reaction when none exists', async () => {
    // Lookup returns no existing reaction
    reactionsChain = createChain({ data: null, error: null });
    // After insert, articles chain returns updated counts
    articlesChain = createChain({
      data: { ...ARTICLE_ROW, reaction_fire: 6 },
      error: null,
    });

    const res = await POST(
      makePostRequest({ articleId: 'abc', emoji: 'fire', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactions.fire).toBe(6);
  });

  it('removes an existing reaction (toggle off)', async () => {
    // Lookup returns existing reaction
    reactionsChain = createChain({ data: { id: 'reaction-1' }, error: null });
    // After delete, articles chain returns decremented counts
    articlesChain = createChain({
      data: { ...ARTICLE_ROW, reaction_fire: 4 },
      error: null,
    });

    const res = await POST(
      makePostRequest({ articleId: 'abc', emoji: 'fire', fingerprint: 'fp1' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactions.fire).toBe(4);
  });

  it('returns 400 for invalid JSON body', async () => {
    reactionsChain = createChain({ data: null, error: null });
    articlesChain = createChain({ data: null, error: null });

    const res = await POST(
      new Request('https://localhost/api/reactions', {
        method: 'POST',
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/);
  });
});
