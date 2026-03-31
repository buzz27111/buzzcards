import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

let pollFetchResult: { data: unknown; error: unknown };
let pollUpdateResult: { data: unknown; error: unknown };

function createFetchChain(): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(pollFetchResult),
    })),
  };
  return chain;
}

function createUpdateChain(): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(pollUpdateResult),
    })),
    single: vi.fn().mockReturnThis(),
  };
  return chain;
}

let callCount: number;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => {
      callCount++;
      // First call is the fetch (select + single), second is the update
      if (callCount === 1) return createFetchChain();
      return createUpdateChain();
    },
  }),
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('https://localhost/api/polls/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const POLL_DATA = {
  id: 'poll-1',
  question: 'Favorite language?',
  options: ['TypeScript', 'Python', 'Rust'],
  votes: { '0': 10, '1': 5 },
  voted_fingerprints: ['existing-fp'],
};

describe('POST /api/polls/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    pollUpdateResult = { data: null, error: null };
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await POST(
      new Request('https://localhost/api/polls/vote', {
        method: 'POST',
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/);
  });

  it('returns 400 for missing fields', async () => {
    const res = await POST(makeRequest({ pollId: 'poll-1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 400 for negative optionIndex', async () => {
    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: -1, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when poll not found', async () => {
    pollFetchResult = { data: null, error: { message: 'not found' } };

    const res = await POST(
      makeRequest({ pollId: 'missing', optionIndex: 0, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 409 when fingerprint already voted', async () => {
    pollFetchResult = { data: { ...POLL_DATA }, error: null };

    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 0, fingerprint: 'existing-fp' })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Already voted/);
  });

  it('returns 400 when optionIndex out of range', async () => {
    pollFetchResult = { data: { ...POLL_DATA }, error: null };

    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 5, fingerprint: 'new-fp' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/out of range/);
  });

  it('records vote and returns percentage breakdown', async () => {
    pollFetchResult = {
      data: {
        ...POLL_DATA,
        votes: { '0': 10, '1': 5 },
        voted_fingerprints: [],
      },
      error: null,
    };
    pollUpdateResult = { data: null, error: null };

    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 2, fingerprint: 'new-fp' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalVotes).toBe(16); // 10 + 5 + 1
    expect(body.results).toHaveLength(3);
    expect(body.results[2].votes).toBe(1);
    expect(body.results[2].percentage).toBe(6); // Math.round(1/16*100)
  });

  it('handles vote on option with no prior votes', async () => {
    pollFetchResult = {
      data: {
        ...POLL_DATA,
        votes: {},
        voted_fingerprints: [],
      },
      error: null,
    };
    pollUpdateResult = { data: null, error: null };

    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 0, fingerprint: 'fp1' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalVotes).toBe(1);
    expect(body.results[0].votes).toBe(1);
    expect(body.results[0].percentage).toBe(100);
  });

  it('returns results covering all options with correct totalVotes', async () => {
    pollFetchResult = {
      data: {
        ...POLL_DATA,
        votes: { '0': 3, '1': 7 },
        voted_fingerprints: [],
      },
      error: null,
    };
    pollUpdateResult = { data: null, error: null };

    const res = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 1, fingerprint: 'new-fp' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // 3 + 8 + 0 = 11
    expect(body.totalVotes).toBe(11);
    expect(body.results).toHaveLength(3);
    // Every option should have a result entry
    expect(body.results.map((r: { optionIndex: number }) => r.optionIndex)).toEqual([0, 1, 2]);
    // Votes should sum to totalVotes
    const voteSum = body.results.reduce((s: number, r: { votes: number }) => s + r.votes, 0);
    expect(voteSum).toBe(body.totalVotes);
  });

  it('prevents a second vote from the same fingerprint on the same poll', async () => {
    // First vote succeeds
    pollFetchResult = {
      data: {
        ...POLL_DATA,
        votes: { '0': 1 },
        voted_fingerprints: [],
      },
      error: null,
    };
    pollUpdateResult = { data: null, error: null };
    callCount = 0;

    const res1 = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 0, fingerprint: 'dup-fp' })
    );
    expect(res1.status).toBe(200);

    // Second vote from same fingerprint is rejected
    pollFetchResult = {
      data: {
        ...POLL_DATA,
        votes: { '0': 2 },
        voted_fingerprints: ['dup-fp'],
      },
      error: null,
    };
    callCount = 0;

    const res2 = await POST(
      makeRequest({ pollId: 'poll-1', optionIndex: 1, fingerprint: 'dup-fp' })
    );
    expect(res2.status).toBe(409);
    const body = await res2.json();
    expect(body.error).toMatch(/Already voted/);
  });
});
