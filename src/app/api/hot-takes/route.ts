import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { HotTake } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Simple profanity word list for content filtering.
 * Checks if any word in the text matches a known profane word.
 */
const PROFANITY_LIST = [
  'ass', 'asshole', 'bastard', 'bitch', 'bullshit', 'crap', 'cunt',
  'damn', 'dick', 'dumbass', 'fuck', 'fucking', 'hell', 'idiot',
  'jackass', 'motherfucker', 'piss', 'shit', 'slut', 'whore',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  // Split on non-alpha characters to get individual words
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  return words.some((word) => PROFANITY_LIST.includes(word));
}

/**
 * POST /api/hot-takes
 * Body: { articleId: string, text: string, fingerprint: string }
 * Applies profanity filter. Rejects if profane.
 * Returns: { hotTake: HotTake } or { error: string }
 */
export async function POST(request: Request) {
  let body: { articleId?: string; text?: string; fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { articleId, text, fingerprint } = body;

  if (!articleId || !text || !fingerprint) {
    return NextResponse.json(
      { error: 'Missing required fields: articleId, text, fingerprint' },
      { status: 400 }
    );
  }

  if (text.length > 140) {
    return NextResponse.json(
      { error: 'Hot take must be 140 characters or fewer' },
      { status: 400 }
    );
  }

  if (containsProfanity(text)) {
    return NextResponse.json(
      { error: 'Your comment violates our content guidelines. Please remove inappropriate language.' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('hot_takes')
    .insert({
      article_id: articleId,
      text,
      fingerprint,
    })
    .select('id, article_id, text, upvotes, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hotTake: HotTake = {
    id: data.id,
    articleId: data.article_id,
    text: data.text,
    upvotes: data.upvotes ?? 0,
    createdAt: data.created_at,
  };

  return NextResponse.json({ hotTake }, { status: 201 });
}

/**
 * GET /api/hot-takes?articleId=string
 * Returns top 3 hot takes by upvote count for an article.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');

  if (!articleId) {
    return NextResponse.json({ error: 'Missing required param: articleId' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('hot_takes')
    .select('id, article_id, text, upvotes, created_at')
    .eq('article_id', articleId)
    .order('upvotes', { ascending: false })
    .limit(3);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hotTakes: HotTake[] = (data ?? []).map((row) => ({
    id: row.id,
    articleId: row.article_id,
    text: row.text,
    upvotes: row.upvotes ?? 0,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ hotTakes });
}
