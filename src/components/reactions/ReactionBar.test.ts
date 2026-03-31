import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: vi.fn(() => 'mock-uuid-1234') },
});

import { getFingerprint, getStoredReactions, storeReactions } from './ReactionBar';

describe('getFingerprint', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('generates and stores a new fingerprint when none exists', () => {
    const fp = getFingerprint();
    expect(fp).toBe('mock-uuid-1234');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('buzzcards_fingerprint', 'mock-uuid-1234');
  });

  it('returns existing fingerprint from localStorage', () => {
    store['buzzcards_fingerprint'] = 'existing-fp';
    const fp = getFingerprint();
    expect(fp).toBe('existing-fp');
  });
});

describe('getStoredReactions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns empty array when no reactions stored', () => {
    const reactions = getStoredReactions('article-1', 'fp-1');
    expect(reactions).toEqual([]);
  });

  it('returns stored reactions for an article', () => {
    store['reactions_article-1_fp-1'] = JSON.stringify(['fire', 'heart']);
    const reactions = getStoredReactions('article-1', 'fp-1');
    expect(reactions).toEqual(['fire', 'heart']);
  });

  it('returns empty array for invalid JSON', () => {
    store['reactions_article-1_fp-1'] = 'not-json';
    const reactions = getStoredReactions('article-1', 'fp-1');
    expect(reactions).toEqual([]);
  });
});

describe('storeReactions', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('stores reactions in localStorage keyed by articleId and fingerprint', () => {
    storeReactions('article-1', 'fp-1', ['fire', 'sad']);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'reactions_article-1_fp-1',
      JSON.stringify(['fire', 'sad'])
    );
  });

  it('stored reactions can be retrieved', () => {
    storeReactions('article-2', 'fp-2', ['mindblown']);
    const reactions = getStoredReactions('article-2', 'fp-2');
    expect(reactions).toEqual(['mindblown']);
  });

  it('overwrites previous reactions for the same article and fingerprint', () => {
    storeReactions('article-1', 'fp-1', ['fire']);
    storeReactions('article-1', 'fp-1', ['fire', 'heart']);
    const reactions = getStoredReactions('article-1', 'fp-1');
    expect(reactions).toEqual(['fire', 'heart']);
  });
});
