import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { titleSimilarity } from '@/lib/scraper/dedup';
import type { Article } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COMPARE_SIMILARITY_THRESHOLD = 0.7;

/** Map a Supabase row to the camelCase Article interface. */
function mapRow(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    summary: (row.summary as string) ?? null,
    sourceUrl: row.source_url as string,
    pubDate: row.pub_date as string,
    author: (row.author as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    category: row.category as Article['category'],
    sourceName: row.source_name as string,
    geoLocation: (row.geo_location as Article['geoLocation']) ?? null,
    reactions: {
      fire: (row.reaction_fire as number) ?? 0,
      heart: (row.reaction_heart as number) ?? 0,
      mindblown: (row.reaction_mindblown as number) ?? 0,
      sad: (row.reaction_sad as number) ?? 0,
      angry: (row.reaction_angry as number) ?? 0,
    },
    shareCount: (row.share_count as number) ?? 0,
    fetchTimestamp: row.fetch_timestamp as string,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');

  if (!articleId) {
    return NextResponse.json(
      { error: 'articleId query parameter is required' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // 1. Fetch the source article
  const { data: sourceRow, error: sourceError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (sourceError || !sourceRow) {
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }

  // 2. Fetch recent articles from different sources
  const { data: candidates, error: candidatesError } = await supabase
    .from('articles')
    .select('*')
    .neq('source_name', sourceRow.source_name)
    .order('pub_date', { ascending: false })
    .limit(200);

  if (candidatesError) {
    return NextResponse.json(
      { error: candidatesError.message },
      { status: 500 }
    );
  }

  // 3. Find the closest match with ≥70% similarity
  let bestMatch: Record<string, unknown> | null = null;
  let bestScore = 0;

  for (const candidate of candidates ?? []) {
    const score = titleSimilarity(sourceRow.title, candidate.title);
    if (score >= COMPARE_SIMILARITY_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  if (!bestMatch) {
    return NextResponse.json(
      { error: 'No matching article found from a different source' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    article: mapRow(sourceRow),
    comparison: mapRow(bestMatch),
  });
}
