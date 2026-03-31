import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then?: (resolve: (v: unknown) => void) => void;
}

let pollsResult: { data: unknown; error: unknown };

function createChain(): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(pollsResult),
    })),
  };
  return chain;
}

let pollsChain: MockChain;

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => pollsChain,
  }),
}));

import { GET } from './route';

describe('GET /api/polls/active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pollsChain = createChain();
  });

  it('returns polls with totalVotes calculated', async () => {
    pollsResult = {
      data: [
        {
          id: 'poll-1',
          question: 'Favorite language?',
          options: ['TypeScript', 'Python', 'Rust'],
          votes: { '0': 10, '1': 5, '2': 3 },
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.polls).toHaveLength(1);
    expect(body.polls[0].totalVotes).toBe(18);
    expect(body.polls[0].question).toBe('Favorite language?');
  });

  it('returns empty array when no polls exist', async () => {
    pollsResult = { data: [], error: null };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.polls).toEqual([]);
  });

  it('handles polls with empty votes', async () => {
    pollsResult = {
      data: [
        {
          id: 'poll-2',
          question: 'Best framework?',
          options: ['Next.js', 'Remix'],
          votes: {},
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    };

    const res = await GET();
    const body = await res.json();
    expect(body.polls[0].totalVotes).toBe(0);
  });

  it('returns 500 on database error', async () => {
    pollsResult = { data: null, error: { message: 'DB error' } };

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
