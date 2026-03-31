import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawArticle } from '@/lib/scraper/scraper';

// Mock modules before importing the handler
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    CRON_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'key',
    AWS_SECRET_ACCESS_KEY: 'secret',
    BEDROCK_MODEL_ID: 'model',
  }),
}));

const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === 'articles') {
        return {
          insert: mockInsert,
          delete: mockDelete,
        };
      }
      return {};
    },
  }),
}));

const mockScrapeAllFeeds = vi.fn();
vi.mock('@/lib/scraper/scraper', () => ({
  scrapeAllFeeds: (...args: unknown[]) => mockScrapeAllFeeds(...args),
}));

const mockIsDuplicate = vi.fn();
vi.mock('@/lib/scraper/dedup', () => ({
  isDuplicate: (...args: unknown[]) => mockIsDuplicate(...args),
}));

const mockSummarizeArticle = vi.fn();
vi.mock('@/lib/scraper/summarizer', () => ({
  summarizeArticle: (...args: unknown[]) => mockSummarizeArticle(...args),
}));

const mockInferGeoLocation = vi.fn();
vi.mock('@/lib/scraper/geo', () => ({
  inferGeoLocation: (...args: unknown[]) => mockInferGeoLocation(...args),
}));

vi.mock('@/lib/constants', () => ({
  FEED_SOURCES: [{ name: 'Test', url: 'https://test.com/feed', category: 'technology' }],
}));

import { GET } from './route';

function makeArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Test Article',
    description: 'A test article description',
    sourceUrl: 'https://example.com/article',
    pubDate: new Date('2024-01-15'),
    author: 'Author',
    imageUrl: 'https://example.com/img.jpg',
    sourceName: 'Test',
    category: 'technology',
    ...overrides,
  };
}

describe('GET /api/cron/scrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInferGeoLocation.mockReturnValue(null);
    mockDelete.mockReturnValue({
      lt: vi.fn().mockResolvedValue({ count: 0, error: null }),
    });
  });

  it('returns 401 when authorization header is missing', async () => {
    const request = new Request('https://localhost/api/cron/scrape');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when authorization header is invalid', async () => {
    const request = new Request('https://localhost/api/cron/scrape', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 200 with stats on successful scrape', async () => {
    const articles = [makeArticle(), makeArticle({ title: 'Second', sourceUrl: 'https://example.com/2' })];
    mockScrapeAllFeeds.mockResolvedValue(articles);
    mockIsDuplicate.mockResolvedValue(false);
    mockSummarizeArticle.mockResolvedValue('A summary');
    mockInsert.mockResolvedValue({ error: null });

    const request = new Request('https://localhost/api/cron/scrape', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stats.totalFetched).toBe(2);
    expect(body.stats.duplicatesSkipped).toBe(0);
    expect(body.stats.newStored).toBe(2);
  });

  it('skips duplicate articles', async () => {
    const articles = [makeArticle(), makeArticle({ title: 'Dup', sourceUrl: 'https://dup.com' })];
    mockScrapeAllFeeds.mockResolvedValue(articles);
    mockIsDuplicate.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockSummarizeArticle.mockResolvedValue('Summary');
    mockInsert.mockResolvedValue({ error: null });

    const request = new Request('https://localhost/api/cron/scrape', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    const body = await response.json();

    expect(body.stats.totalFetched).toBe(2);
    expect(body.stats.duplicatesSkipped).toBe(1);
    expect(body.stats.newStored).toBe(1);
    expect(mockSummarizeArticle).toHaveBeenCalledTimes(1);
  });

  it('handles insert errors gracefully', async () => {
    mockScrapeAllFeeds.mockResolvedValue([makeArticle()]);
    mockIsDuplicate.mockResolvedValue(false);
    mockSummarizeArticle.mockResolvedValue('Summary');
    mockInsert.mockResolvedValue({ error: { message: 'unique constraint' } });

    const request = new Request('https://localhost/api/cron/scrape', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.stats.newStored).toBe(0);
  });

  it('reports cleanup count', async () => {
    mockScrapeAllFeeds.mockResolvedValue([]);
    mockDelete.mockReturnValue({
      lt: vi.fn().mockResolvedValue({ count: 5, error: null }),
    });

    const request = new Request('https://localhost/api/cron/scrape', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    const body = await response.json();

    expect(body.stats.cleanedUp).toBe(5);
    expect(body.stats.totalFetched).toBe(0);
  });
});
