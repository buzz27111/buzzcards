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
  single: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

function createChain(finalValue: { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({
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

import { POST } from './route';

describe('POST /api/hot-takes/upvote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePostRequest(body: Record<string, unknown>) {
    return new Request('https://localhost/api/hot-takes/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 for invalid JSON', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(
      new Request('https://localhost/api/hot-takes/upvote', { method: 'POST', body: 'not json' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/);
  });

  it('returns 400 for missing fields', async () => {
    hotTakesChain = createChain({ data: null, error: null });
    const res = await POST(makePostRequest({ hotTakeId: 'ht-1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 404 when hot take not found', async () => {
    hotTakesChain = createChain({ data: null, error: { message: 'not found' } });
    const res = await POST(makePostRequest({ hotTakeId: 'missing', fingerprint: 'fp1' }));
    expect(res.status).toBe(404);
  });

  it('adds upvote when not previously upvoted', async () => {
    // First call: fetch returns the hot take (not yet upvoted by fp1)
    // Second call: update succeeds
    const fetchResult = {
      data: { id: 'ht-1', upvotes: 5, upvoted_fingerprints: ['fp2'] },
      error: null,
    };
    hotTakesChain = createChain(fetchResult);

    const res = await POST(makePostRequest({ hotTakeId: 'ht-1', fingerprint: 'fp1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upvotes).toBe(6);
  });

  it('removes upvote when already upvoted (toggle off)', async () => {
    const fetchResult = {
      data: { id: 'ht-1', upvotes: 5, upvoted_fingerprints: ['fp1', 'fp2'] },
      error: null,
    };
    hotTakesChain = createChain(fetchResult);

    const res = await POST(makePostRequest({ hotTakeId: 'ht-1', fingerprint: 'fp1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upvotes).toBe(4);
  });

  it('does not go below 0 upvotes', async () => {
    const fetchResult = {
      data: { id: 'ht-1', upvotes: 0, upvoted_fingerprints: ['fp1'] },
      error: null,
    };
    hotTakesChain = createChain(fetchResult);

    const res = await POST(makePostRequest({ hotTakeId: 'ht-1', fingerprint: 'fp1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upvotes).toBe(0);
  });
});
