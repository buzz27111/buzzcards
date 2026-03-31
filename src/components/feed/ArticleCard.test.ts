import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock dependencies that ArticleCard.tsx imports
vi.mock('@/lib/constants', () => ({
  CATEGORY_COLORS: {},
}));

vi.mock('@/lib/types', () => ({}));

vi.mock('next/image', () => ({
  default: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: { article: 'article' },
}));

vi.mock('@/components/sharing/ShareMenu', () => ({
  default: () => null,
}));

import { timeAgo, readingTime } from './ArticleCard';

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for a date less than 60 seconds ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:30Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('just now');
  });

  it('returns minutes ago for dates within the last hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:05:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('5m ago');
  });

  it('returns hours ago for dates within the last day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T15:00:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('3h ago');
  });

  it('returns days ago for dates within the last month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-18T12:00:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('3d ago');
  });

  it('returns months ago for dates older than 30 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-09-15T12:00:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('3mo ago');
  });

  it('returns "1m ago" at exactly 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:01:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('1m ago');
  });

  it('returns "1h ago" at exactly 60 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T13:00:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('1h ago');
  });

  it('returns "1d ago" at exactly 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-16T12:00:00Z'));
    expect(timeAgo('2024-06-15T12:00:00Z')).toBe('1d ago');
  });
});

describe('readingTime', () => {
  it('returns "1 min read" for short text', () => {
    expect(readingTime('Hello world')).toBe('1 min read');
  });

  it('returns "1 min read" for empty string', () => {
    expect(readingTime('')).toBe('1 min read');
  });

  it('returns "1 min read" for text under 200 words', () => {
    const words = Array(150).fill('word').join(' ');
    expect(readingTime(words)).toBe('1 min read');
  });

  it('returns "2 min read" for text between 201 and 400 words', () => {
    const words = Array(250).fill('word').join(' ');
    expect(readingTime(words)).toBe('2 min read');
  });

  it('returns correct reading time for longer text', () => {
    const words = Array(600).fill('word').join(' ');
    expect(readingTime(words)).toBe('3 min read');
  });

  it('handles whitespace-only text as empty', () => {
    expect(readingTime('   ')).toBe('1 min read');
  });

  it('handles text with multiple spaces between words', () => {
    const text = 'word   word   word';
    expect(readingTime(text)).toBe('1 min read');
  });
});
