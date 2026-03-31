import type { RawArticle } from './scraper';

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Maps known news source names to their headquarters location.
 */
const SOURCE_LOCATIONS: Record<string, GeoLocation> = {
  'BBC News': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
  'Reuters': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
  'Al Jazeera': { lat: 25.2854, lng: 51.531, label: 'Doha, Qatar' },
  'TechCrunch': { lat: 37.7749, lng: -122.4194, label: 'San Francisco, USA' },
  'The Verge': { lat: 40.7128, lng: -74.006, label: 'New York, USA' },
  'Ars Technica': { lat: 40.7128, lng: -74.006, label: 'New York, USA' },
  'Wired': { lat: 37.7749, lng: -122.4194, label: 'San Francisco, USA' },
  'CNBC': { lat: 40.7357, lng: -74.1724, label: 'Englewood Cliffs, USA' },
  'Bloomberg': { lat: 40.7128, lng: -74.006, label: 'New York, USA' },
  'NASA': { lat: 38.8830, lng: -77.0169, label: 'Washington DC, USA' },
  'Nature': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
  'ESPN': { lat: 41.7658, lng: -72.6734, label: 'Bristol, USA' },
  'Variety': { lat: 34.0522, lng: -118.2437, label: 'Los Angeles, USA' },
  'WHO News': { lat: 46.2044, lng: 6.1432, label: 'Geneva, Switzerland' },
  'Hacker News': { lat: 37.7749, lng: -122.4194, label: 'San Francisco, USA' },
  'Product Hunt': { lat: 37.7749, lng: -122.4194, label: 'San Francisco, USA' },
};

/**
 * Maps city/country keywords found in article text to coordinates.
 * Checked against title + description via case-insensitive matching.
 */
const KEYWORD_LOCATIONS: { pattern: RegExp; location: GeoLocation }[] = [
  { pattern: /\bWashington\b/i, location: { lat: 38.9072, lng: -77.0369, label: 'Washington DC, USA' } },
  { pattern: /\bNew York\b/i, location: { lat: 40.7128, lng: -74.006, label: 'New York, USA' } },
  { pattern: /\bLos Angeles\b/i, location: { lat: 34.0522, lng: -118.2437, label: 'Los Angeles, USA' } },
  { pattern: /\bSan Francisco\b/i, location: { lat: 37.7749, lng: -122.4194, label: 'San Francisco, USA' } },
  { pattern: /\bChicago\b/i, location: { lat: 41.8781, lng: -87.6298, label: 'Chicago, USA' } },
  { pattern: /\bLondon\b/i, location: { lat: 51.5074, lng: -0.1278, label: 'London, UK' } },
  { pattern: /\bParis\b/i, location: { lat: 48.8566, lng: 2.3522, label: 'Paris, France' } },
  { pattern: /\bBerlin\b/i, location: { lat: 52.52, lng: 13.405, label: 'Berlin, Germany' } },
  { pattern: /\bTokyo\b/i, location: { lat: 35.6762, lng: 139.6503, label: 'Tokyo, Japan' } },
  { pattern: /\bBeijing\b/i, location: { lat: 39.9042, lng: 116.4074, label: 'Beijing, China' } },
  { pattern: /\bShanghai\b/i, location: { lat: 31.2304, lng: 121.4737, label: 'Shanghai, China' } },
  { pattern: /\bMoscow\b/i, location: { lat: 55.7558, lng: 37.6173, label: 'Moscow, Russia' } },
  { pattern: /\bSydney\b/i, location: { lat: -33.8688, lng: 151.2093, label: 'Sydney, Australia' } },
  { pattern: /\bMumbai\b/i, location: { lat: 19.076, lng: 72.8777, label: 'Mumbai, India' } },
  { pattern: /\bNew Delhi\b/i, location: { lat: 28.6139, lng: 77.209, label: 'New Delhi, India' } },
  { pattern: /\bSão Paulo\b/i, location: { lat: -23.5505, lng: -46.6333, label: 'São Paulo, Brazil' } },
  { pattern: /\bDubai\b/i, location: { lat: 25.2048, lng: 55.2708, label: 'Dubai, UAE' } },
  { pattern: /\bSingapore\b/i, location: { lat: 1.3521, lng: 103.8198, label: 'Singapore' } },
  { pattern: /\bSeoul\b/i, location: { lat: 37.5665, lng: 126.978, label: 'Seoul, South Korea' } },
  { pattern: /\bToronto\b/i, location: { lat: 43.6532, lng: -79.3832, label: 'Toronto, Canada' } },
  { pattern: /\bUkraine\b/i, location: { lat: 50.4501, lng: 30.5234, label: 'Kyiv, Ukraine' } },
  { pattern: /\bIsrael\b/i, location: { lat: 31.7683, lng: 35.2137, label: 'Jerusalem, Israel' } },
  { pattern: /\bGaza\b/i, location: { lat: 31.3547, lng: 34.3088, label: 'Gaza' } },
  { pattern: /\bTaiwan\b/i, location: { lat: 25.033, lng: 121.5654, label: 'Taipei, Taiwan' } },
  { pattern: /\bHong Kong\b/i, location: { lat: 22.3193, lng: 114.1694, label: 'Hong Kong' } },
];

/**
 * Infers a geographic location for an article using:
 * 1. Keyword matching in title/description (higher priority — more specific)
 * 2. Source name lookup (fallback — headquarters location)
 *
 * Returns null if no location can be determined.
 */
export function inferGeoLocation(article: RawArticle): GeoLocation | null {
  const text = `${article.title} ${article.description}`;

  // First try keyword matching in article content
  for (const { pattern, location } of KEYWORD_LOCATIONS) {
    if (pattern.test(text)) {
      return location;
    }
  }

  // Fall back to source headquarters
  const sourceLoc = SOURCE_LOCATIONS[article.sourceName];
  if (sourceLoc) {
    return sourceLoc;
  }

  return null;
}
