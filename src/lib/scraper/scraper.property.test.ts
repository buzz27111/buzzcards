import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { scrapeFeed, type RawArticle } from './scraper';
import type { FeedSource, Category } from '@/lib/types';

/**
 * **Validates: Requirements 25.3**
 *
 * Property 1: Round-trip consistency for feed parsing
 * For all valid RSS feed entries, parsing the feed via scrapeFeed then
 * inspecting the extracted RawArticle fields should produce data equivalent
 * to the original entry.
 */

// Mock rss-parser so we control what parseURL returns
vi.mock('rss-parser', () => {
  const MockParser = vi.fn();
  MockParser.prototype.parseURL = vi.fn();
  return { default: MockParser };
});

import Parser from 'rss-parser';

const mockParseURL = Parser.prototype.parseURL as ReturnType<typeof vi.fn>;

const CATEGORIES: Category[] = [
  'technology', 'world', 'finance', 'science',
  'sports', 'entertainment', 'health', 'startup',
];

// Arbitrary for a non-empty printable string (no control chars)
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// Arbitrary for a valid URL string
const arbUrl = fc.webUrl();

// Arbitrary for a valid ISO date string
const arbIsoDate = fc.date({
  min: new Date('2000-01-01T00:00:00Z'),
  max: new Date('2030-12-31T23:59:59Z'),
}).map((d) => d.toISOString());

// Arbitrary for a category
const arbCategory = fc.constantFrom(...CATEGORIES);

// Arbitrary for optional author (string or undefined)
const arbOptionalAuthor = fc.option(arbNonEmptyString, { nil: undefined });

// Arbitrary for a valid feed item that scrapeFeed will accept
const arbFeedItem = fc.record({
  title: arbNonEmptyString,
  link: arbUrl,
  contentSnippet: arbNonEmptyString,
  isoDate: arbIsoDate,
  creator: arbOptionalAuthor,
});

// Arbitrary for a FeedSource
const arbFeedSource = fc.record({
  name: arbNonEmptyString,
  url: arbUrl,
  category: arbCategory,
});

describe('scrapeFeed property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 1: round-trip consistency — parsed article fields match original feed entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbFeedItem,
        arbFeedSource,
        async (feedItem, source) => {
          // Arrange: mock parseURL to return a feed with our generated item
          mockParseURL.mockResolvedValue({
            items: [{
              ...feedItem,
              content: '',
              summary: '',
              enclosure: undefined,
            }],
          });

          // Act: parse the feed
          const articles = await scrapeFeed(source);

          // Assert: exactly one article extracted
          expect(articles).toHaveLength(1);

          const article: RawArticle = articles[0];

          // Title round-trips exactly
          expect(article.title).toBe(feedItem.title);

          // Description comes from contentSnippet
          expect(article.description).toBe(feedItem.contentSnippet);

          // Source URL matches the link
          expect(article.sourceUrl).toBe(feedItem.link);

          // Publication date matches the isoDate
          expect(article.pubDate).toEqual(new Date(feedItem.isoDate));

          // Author matches creator (null when undefined)
          expect(article.author).toBe(feedItem.creator ?? null);

          // Source metadata comes from the FeedSource
          expect(article.sourceName).toBe(source.name);
          expect(article.category).toBe(source.category);

          // No image when content is empty and no enclosure
          expect(article.imageUrl).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
