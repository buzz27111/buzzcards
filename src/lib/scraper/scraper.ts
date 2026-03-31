import Parser from 'rss-parser';
import type { FeedSource, Category } from '@/lib/types';
import type { GeoLocation } from './geo';

export interface RawArticle {
  title: string;
  description: string;
  sourceUrl: string;
  pubDate: Date;
  author: string | null;
  imageUrl: string | null;
  sourceName: string;
  category: Category;
  geoLocation?: GeoLocation | null;
}

const MAX_ARTICLES_PER_SOURCE = 50;
const FEED_TIMEOUT_MS = 10_000;
const DELAY_BETWEEN_SOURCES_MS = 2_000;

function extractImageUrl(item: Parser.Item): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  // Try to extract first image from content/description HTML
  const html = item.content || item.summary || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses a single RSS feed source and returns up to 50 raw articles.
 * Times out after 10 seconds if the feed doesn't respond.
 */
export async function scrapeFeed(source: FeedSource): Promise<RawArticle[]> {
  const parser = new Parser({ timeout: FEED_TIMEOUT_MS });

  const feed = await parser.parseURL(source.url);
  const articles: RawArticle[] = [];

  for (const item of feed.items) {
    if (articles.length >= MAX_ARTICLES_PER_SOURCE) break;

    // Skip entries missing required fields (title or link)
    if (!item.title || !item.link) {
      console.warn(
        `[scraper] Skipping entry from ${source.name}: missing ${!item.title ? 'title' : 'link'}`
      );
      continue;
    }

    const pubDate = item.isoDate
      ? new Date(item.isoDate)
      : item.pubDate
        ? new Date(item.pubDate)
        : new Date();

    articles.push({
      title: item.title,
      description: item.contentSnippet || item.summary || item.content || '',
      sourceUrl: item.link,
      pubDate,
      author: item.creator || null,
      imageUrl: extractImageUrl(item),
      sourceName: source.name,
      category: source.category,
    });
  }

  return articles;
}

/**
 * Scrapes all configured feed sources sequentially with a 2-second delay
 * between each request. Skips failed sources and logs errors.
 */
export async function scrapeAllFeeds(sources: FeedSource[]): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    try {
      const articles = await scrapeFeed(source);
      allArticles.push(...articles);
      console.log(
        `[scraper] ${source.name}: fetched ${articles.length} articles`
      );
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(
        `[scraper] [${timestamp}] Failed to scrape ${source.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Wait 2 seconds before the next source (skip delay after the last one)
    if (i < sources.length - 1) {
      await delay(DELAY_BETWEEN_SOURCES_MS);
    }
  }

  return allArticles;
}
