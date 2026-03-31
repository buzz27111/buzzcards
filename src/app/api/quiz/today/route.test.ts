import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  }),
}));

let quizFetchResult: { data: unknown; error: unknown };
let articlesFetchResult: { data: unknown; error: unknown };
let quizInsertResult: { data: unknown; error: unknown };
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

function createArticlesFetchChain() {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(articlesFetchResult),
    })),
  };
}

function createInsertChain() {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) => resolve(quizInsertResult),
    })),
  };
}

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: () => {
      callCount++;
      if (callCount === 1) return createQuizFetchChain();
      if (callCount === 2) return createArticlesFetchChain();
      return createInsertChain();
    },
  }),
}));

import { GET } from './route';

const EXISTING_QUIZ = {
  id: 'quiz-1',
  quiz_date: '2025-01-01',
  questions: [
    {
      question: 'Which source published: "AI Breakthrough"?',
      options: ['TechCrunch', 'BBC News', 'Reuters', 'ESPN'],
      correctIndex: 0,
      articleId: 'art-1',
    },
  ],
};

const ARTICLES = [
  { id: 'a1', title: 'AI Breakthrough', source_name: 'TechCrunch' },
  { id: 'a2', title: 'Market Rally', source_name: 'CNBC' },
  { id: 'a3', title: 'Space Discovery', source_name: 'NASA' },
  { id: 'a4', title: 'Health Update', source_name: 'WHO News' },
  { id: 'a5', title: 'Sports Final', source_name: 'ESPN' },
  { id: 'a6', title: 'New Startup', source_name: 'Hacker News' },
  { id: 'a7', title: 'Movie Release', source_name: 'Variety' },
  { id: 'a8', title: 'Climate Report', source_name: 'BBC News' },
  { id: 'a9', title: 'Tech Review', source_name: 'The Verge' },
  { id: 'a10', title: 'Finance News', source_name: 'Bloomberg' },
];

describe('GET /api/quiz/today', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
  });

  it('returns existing quiz without correctIndex', async () => {
    quizFetchResult = { data: { ...EXISTING_QUIZ }, error: null };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('quiz-1');
    expect(body.questions).toHaveLength(1);
    // correctIndex should be stripped
    expect(body.questions[0]).not.toHaveProperty('correctIndex');
    expect(body.questions[0]).toHaveProperty('question');
    expect(body.questions[0]).toHaveProperty('options');
    expect(body.questions[0]).toHaveProperty('articleId');
  });

  it('generates new quiz when none exists for today', async () => {
    // First call: no quiz found (PGRST116)
    quizFetchResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    // Second call: articles
    articlesFetchResult = { data: [...ARTICLES], error: null };
    // Third call: insert
    const generatedQuiz = {
      id: 'new-quiz',
      quiz_date: new Date().toISOString().slice(0, 10),
      questions: [
        {
          question: 'Which source published: "AI Breakthrough"?',
          options: ['TechCrunch', 'CNBC', 'NASA', 'WHO News'],
          correctIndex: 0,
          articleId: 'a1',
        },
      ],
    };
    quizInsertResult = { data: generatedQuiz, error: null };

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('new-quiz');
    expect(body.questions[0]).not.toHaveProperty('correctIndex');
  });

  it('returns 404 when no articles available', async () => {
    quizFetchResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    articlesFetchResult = { data: [], error: null };

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/No articles/);
  });

  it('returns 500 on quiz fetch error', async () => {
    quizFetchResult = { data: null, error: { code: 'OTHER', message: 'DB error' } };

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});
