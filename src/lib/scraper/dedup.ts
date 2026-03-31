import { getServerSupabase } from '@/lib/supabase';
import type { RawArticle } from './scraper';

const SIMILARITY_THRESHOLD = 0.85;

/**
 * Computes bigrams (pairs of consecutive characters) from a string.
 */
function bigrams(str: string): string[] {
  const s = str.toLowerCase();
  const result: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    result.push(s.slice(i, i + 2));
  }
  return result;
}

/**
 * Returns a similarity score between 0 and 1 using the Dice coefficient
 * (bigram similarity). A score of 1 means identical strings, 0 means
 * completely different.
 */
export function titleSimilarity(a: string, b: string): number {
  const trimA = a.trim();
  const trimB = b.trim();

  if (trimA === trimB) return 1;
  if (trimA.length < 2 || trimB.length < 2) return 0;

  const bigramsA = bigrams(trimA);
  const bigramsB = bigrams(trimB);

  const setB = new Map<string, number>();
  for (const bg of bigramsB) {
    setB.set(bg, (setB.get(bg) ?? 0) + 1);
  }

  let matches = 0;
  for (const bg of bigramsA) {
    const count = setB.get(bg);
    if (count && count > 0) {
      matches++;
      setB.set(bg, count - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

/**
 * Checks whether an article is a duplicate by:
 * 1. Querying the articles table for a matching source_url
 * 2. Comparing the article title against recent titles in the same category
 *    using Dice coefficient similarity (threshold > 85%)
 *
 * Returns true if the article should be discarded.
 */
export async function isDuplicate(article: RawArticle): Promise<boolean> {
  const supabase = getServerSupabase();

  // 1. Check source URL uniqueness
  const { data: urlMatch, error: urlError } = await supabase
    .from('articles')
    .select('id')
    .eq('source_url', article.sourceUrl)
    .limit(1);

  if (urlError) {
    console.error('[dedup] Error checking source URL:', urlError.message);
    // On error, allow the article through — the UNIQUE constraint will catch true dupes
    return false;
  }

  if (urlMatch && urlMatch.length > 0) {
    return true;
  }

  // 2. Check title similarity against articles in the same category
  const { data: existingArticles, error: titleError } = await supabase
    .from('articles')
    .select('title')
    .eq('category', article.category)
    .order('pub_date', { ascending: false })
    .limit(200);

  if (titleError) {
    console.error('[dedup] Error fetching titles:', titleError.message);
    return false;
  }

  if (existingArticles) {
    for (const existing of existingArticles) {
      if (titleSimilarity(article.title, existing.title) > SIMILARITY_THRESHOLD) {
        return true;
      }
    }
  }

  return false;
}
