import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeFeed, scrapeAllFeeds, type RawArticle } from './scraper';
import type { FeedSource } from '@/lib/types';

// Mock rss-parser
vi.mock('rss-parser', () => {
  const MockParser = vi.fn();
  MockParser.prototype.parseURL = vi.fn();
  return { default: MockParser };
});

import Parser from 'rss-parser';

const mockParseURL = Parser.prototype.parseURL as ReturnType<typeof vi.fn>;

const testSource: FeedSource = {
  name: 'TestSource',
  url: 'https://example.com/feed',
  category: 'technology',
};

function makeFeedItem(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Article',
    link: 'https://example.com/article-1',
    contentSnippet: 'A short description',
    isoDate: '2024-01-15T12:00:00Z',
    creator: 'Author Name',
    content: '',
    summary: '',
    enclosure: undefined,
    ...overrides,
  };
}

describe('scrapeFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract all fields from a valid feed entry', async () => {
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem()],
    });

    const articles = await scrapeFeed(testSource);

    expect(articles).toHaveLength(1);
    expect(articles[0]).toEqual({
      title: 'Test Article',
      description: 'A short description',
      sourceUrl: 'https://example.com/article-1',
      pubDate: new Date('2024-01-15T12:00:00Z'),
      author: 'Author Name',
      imageUrl: null,
      sourceName: 'TestSource',
      category: 'technology',
    });
  });

  it('should skip entries missing title', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem({ title: undefined }), makeFeedItem({ title: 'Valid' })],
    });

    const articles = await scrapeFeed(testSource);

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Valid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing title')
    );
    warnSpy.mockRestore();
  });

  it('should skip entries missing link', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem({ link: undefined })],
    });

    const articles = await scrapeFeed(testSource);

    expect(articles).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('missing link')
    );
    warnSpy.mockRestore();
  });

  it('should return at most 50 articles', async () => {
    const items = Array.from({ length: 60 }, (_, i) =>
      makeFeedItem({ title: `Article ${i}`, link: `https://example.com/${i}` })
    );
    mockParseURL.mockResolvedValue({ items });

    const articles = await scrapeFeed(testSource);

    expect(articles).toHaveLength(50);
  });

  it('should extract image from enclosure', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        makeFeedItem({
          enclosure: { url: 'https://img.example.com/photo.jpg', type: 'image/jpeg' },
        }),
      ],
    });

    const articles = await scrapeFeed(testSource);
    expect(articles[0].imageUrl).toBe('https://img.example.com/photo.jpg');
  });

  it('should extract image from HTML content', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        makeFeedItem({
          content: '<p>Text</p><img src="https://img.example.com/inline.png" />',
        }),
      ],
    });

    const articles = await scrapeFeed(testSource);
    expect(articles[0].imageUrl).toBe('https://img.example.com/inline.png');
  });

  it('should set author to null when creator is missing', async () => {
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem({ creator: undefined })],
    });

    const articles = await scrapeFeed(testSource);
    expect(articles[0].author).toBeNull();
  });

  it('should fall back to pubDate string when isoDate is missing', async () => {
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem({ isoDate: undefined, pubDate: 'Mon, 15 Jan 2024 12:00:00 GMT' })],
    });

    const articles = await scrapeFeed(testSource);
    expect(articles[0].pubDate).toEqual(new Date('Mon, 15 Jan 2024 12:00:00 GMT'));
  });
});

describe('scrapeAllFeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate articles from multiple sources', async () => {
    mockParseURL.mockResolvedValue({
      items: [makeFeedItem()],
    });

    const sources: FeedSource[] = [
      { name: 'Source1', url: 'https://a.com/feed', category: 'technology' },
      { name: 'Source2', url: 'https://b.com/feed', category: 'world' },
    ];

    const articles = await scrapeAllFeeds(sources);

    expect(articles).toHaveLength(2);
    expect(mockParseURL).toHaveBeenCalledTimes(2);
  });

  it('should skip failed sources and continue', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockParseURL
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ items: [makeFeedItem()] });

    const sources: FeedSource[] = [
      { name: 'FailSource', url: 'https://fail.com/feed', category: 'world' },
      { name: 'GoodSource', url: 'https://good.com/feed', category: 'science' },
    ];

    const articles = await scrapeAllFeeds(sources);

    expect(articles).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to scrape FailSource')
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Network timeout')
    );

    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should log errors with source name and timestamp', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockParseURL.mockRejectedValueOnce(new Error('Connection refused'));

    const sources: FeedSource[] = [
      { name: 'BadSource', url: 'https://bad.com/feed', category: 'finance' },
    ];

    await scrapeAllFeeds(sources);

    const errorCall = errorSpy.mock.calls[0][0] as string;
    expect(errorCall).toContain('BadSource');
    expect(errorCall).toContain('Connection refused');
    // Verify timestamp format (ISO string pattern)
    expect(errorCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    errorSpy.mockRestore();
  });

  it('should return empty array when all sources fail', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockParseURL.mockRejectedValue(new Error('All broken'));

    const sources: FeedSource[] = [
      { name: 'Fail1', url: 'https://f1.com/feed', category: 'health' },
      { name: 'Fail2', url: 'https://f2.com/feed', category: 'sports' },
    ];

    const articles = await scrapeAllFeeds(sources);

    expect(articles).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
  });
});
