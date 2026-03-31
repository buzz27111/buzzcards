import type { Category, FeedSource } from '@/lib/types';

export const CATEGORY_COLORS: Record<
  Category,
  { light: string; dark: string; mapMarker: string }
> = {
  technology: { light: '#3B82F6', dark: '#60A5FA', mapMarker: '#3B82F6' },
  world: { light: '#EF4444', dark: '#F87171', mapMarker: '#EF4444' },
  finance: { light: '#10B981', dark: '#34D399', mapMarker: '#10B981' },
  science: { light: '#8B5CF6', dark: '#A78BFA', mapMarker: '#8B5CF6' },
  sports: { light: '#F59E0B', dark: '#FBBF24', mapMarker: '#F59E0B' },
  entertainment: { light: '#EC4899', dark: '#F472B6', mapMarker: '#EC4899' },
  health: { light: '#14B8A6', dark: '#2DD4BF', mapMarker: '#14B8A6' },
  startup: { light: '#F97316', dark: '#FB923C', mapMarker: '#F97316' },
};

export const FEED_SOURCES: FeedSource[] = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'technology' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'technology' },
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'world' },
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/', category: 'world' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'world' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'finance' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'finance' },
  { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'science' },
  { name: 'Nature', url: 'https://www.nature.com/nature.rss', category: 'science' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'entertainment' },
  { name: 'WHO News', url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'health' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'startup' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', category: 'startup' },
];
