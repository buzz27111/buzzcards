import { describe, it, expect } from 'vitest';
import { inferGeoLocation } from './geo';
import type { RawArticle } from './scraper';

function makeArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  return {
    title: 'Test Article',
    description: 'A generic description with no location hints',
    sourceUrl: 'https://example.com/article',
    pubDate: new Date('2024-01-15'),
    author: 'Author',
    imageUrl: null,
    sourceName: 'Unknown Source',
    category: 'technology',
    ...overrides,
  };
}

describe('inferGeoLocation', () => {
  it('returns source HQ location for known sources with no keyword match', () => {
    const result = inferGeoLocation(makeArticle({ sourceName: 'BBC News' }));
    expect(result).toEqual({ lat: 51.5074, lng: -0.1278, label: 'London, UK' });
  });

  it('returns null for unknown source with no keyword match', () => {
    const result = inferGeoLocation(makeArticle({ sourceName: 'Unknown Blog' }));
    expect(result).toBeNull();
  });

  it('matches keyword in title over source fallback', () => {
    const result = inferGeoLocation(
      makeArticle({ title: 'Earthquake hits Tokyo', sourceName: 'BBC News' })
    );
    expect(result).toEqual({ lat: 35.6762, lng: 139.6503, label: 'Tokyo, Japan' });
  });

  it('matches keyword in description', () => {
    const result = inferGeoLocation(
      makeArticle({ description: 'Officials in Berlin announced new policy' })
    );
    expect(result).toEqual({ lat: 52.52, lng: 13.405, label: 'Berlin, Germany' });
  });

  it('is case-insensitive for keyword matching', () => {
    const result = inferGeoLocation(makeArticle({ title: 'PARIS fashion week begins' }));
    expect(result).toEqual({ lat: 48.8566, lng: 2.3522, label: 'Paris, France' });
  });

  it('returns correct location for each known source', () => {
    const sources: [string, string][] = [
      ['Al Jazeera', 'Doha, Qatar'],
      ['NASA', 'Washington DC, USA'],
      ['ESPN', 'Bristol, USA'],
      ['WHO News', 'Geneva, Switzerland'],
      ['Bloomberg', 'New York, USA'],
    ];

    for (const [name, label] of sources) {
      const result = inferGeoLocation(makeArticle({ sourceName: name }));
      expect(result).not.toBeNull();
      expect(result!.label).toBe(label);
    }
  });

  it('matches first keyword when multiple cities appear', () => {
    // Washington appears before Tokyo in the keyword list
    const result = inferGeoLocation(
      makeArticle({ title: 'Washington and Tokyo discuss trade deal' })
    );
    expect(result).toEqual({ lat: 38.9072, lng: -77.0369, label: 'Washington DC, USA' });
  });

  it('does not match partial city names', () => {
    // "Londonberry" should not match "London" due to word boundary
    const result = inferGeoLocation(
      makeArticle({ title: 'Londonderry news update', sourceName: 'Unknown' })
    );
    expect(result).toBeNull();
  });

  it('returns geo location with valid lat/lng ranges', () => {
    const result = inferGeoLocation(makeArticle({ sourceName: 'TechCrunch' }));
    expect(result).not.toBeNull();
    expect(result!.lat).toBeGreaterThanOrEqual(-90);
    expect(result!.lat).toBeLessThanOrEqual(90);
    expect(result!.lng).toBeGreaterThanOrEqual(-180);
    expect(result!.lng).toBeLessThanOrEqual(180);
    expect(result!.label.length).toBeGreaterThan(0);
  });
});
