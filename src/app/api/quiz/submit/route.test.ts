import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

let quizFetchResult: { data: unknown; error: unknown };
let insertResult: { data: unknown; error: unknown };
let leaderboardResult: { data: unknown; error: unknown };
let callCount: number;

function createQuizFetchChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(quizFetchResult),
    })),
  };
}

function createInsertChain() {
  return {
    insert: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(insertResult),
    })),
  };
}

function createLeaderboardChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(leaderboardResult),
    })),
  };
}

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => {
      callCount++;
      if (callCount === 1) return createQuizFetchChain();
      if (callCount === 2) return createInsertChain();
      return createLeaderboardChain();
    },
  }),
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('https://localhost/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const QUIZ_DATA = {
  id: 'quiz-1',
  questions: [
    { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, articleId: 'a1' },
    { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2, articleId: 'a2' },
    { question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 1, articleId: 'a3' },
    { question: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3, articleId: 'a4' },
    { question: 'Q5', options: ['A', 'B', 'C', 'D'], correctIndex: 0, articleId: 'a5' },
  ],
};

describe('POST /api/quiz/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    insertResult = { data: null, error: null };
    leaderboardResult = {
      data: [
        { fingerprint: 'fp1', score: 5, created_at: '2025-01-01T00:00:00Z' },
        { fingerprint: 'fp2', score: 3, created_at: '2025-01-01T00:01:00Z' },
      ],
      error: null,
    };
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await POST(
      new Request('https://localhost/api/quiz/submit', {
        method: 'POST',
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid JSON/);
  });

  it('returns 400 for missing fields', async () => {
    const res = await POST(makeRequest({ quizId: 'quiz-1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required fields/);
  });

  it('returns 404 when quiz not found', async () => {
    quizFetchResult = { data: null, error: { message: 'not found' } };

    const res = await POST(
      makeRequest({ quizId: 'missing', answers: [0, 0, 0, 0, 0], fingerprint: 'fp1' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when answer count does not match questions', async () => {
    quizFetchResult = { data: { ...QUIZ_DATA }, error: null };

    const res = await POST(
      makeRequest({ quizId: 'quiz-1', answers: [0, 1], fingerprint: 'fp1' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Expected 5 answers/);
  });

  it('scores answers correctly and returns leaderboard', async () => {
    quizFetchResult = { data: { ...QUIZ_DATA }, error: null };

    // Answers: correct for Q1(0), wrong for Q2(0≠2), correct for Q3(1), wrong for Q4(0≠3), correct for Q5(0)
    const res = await POST(
      makeRequest({ quizId: 'quiz-1', answers: [0, 0, 1, 0, 0], fingerprint: 'fp1' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(3);
    expect(body.correct).toEqual([true, false, true, false, true]);
    expect(body.leaderboard).toHaveLength(2);
    expect(body.leaderboard[0].fingerprint).toBe('fp1');
    expect(body.leaderboard[0].score).toBe(5);
  });

  it('returns 409 for duplicate submission', async () => {
    quizFetchResult = { data: { ...QUIZ_DATA }, error: null };
    insertResult = { data: null, error: { code: '23505', message: 'unique violation' } };

    const res = await POST(
      makeRequest({ quizId: 'quiz-1', answers: [0, 2, 1, 3, 0], fingerprint: 'fp1' })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Already submitted/);
  });

  it('returns perfect score when all answers correct', async () => {
    quizFetchResult = { data: { ...QUIZ_DATA }, error: null };

    const res = await POST(
      makeRequest({ quizId: 'quiz-1', answers: [0, 2, 1, 3, 0], fingerprint: 'fp1' })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(5);
    expect(body.correct).toEqual([true, true, true, true, true]);
  });
});
