import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { Article } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
  const category = searchParams.get('category') ?? undefined;

  const offset = (page - 1) * limit;

  const supabase = getServerSupabase();

  let query = supabase
    .from('articles')
    .select('*')
    .order('pub_date', { ascending: false })
    .range(offset, offset + limit); // fetch limit+1 rows to determine hasMore

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const articleRows = hasMore ? rows.slice(0, limit) : rows;

  const articles: Article[] = articleRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    summary: row.summary,
    sourceUrl: row.source_url,
    pubDate: row.pub_date,
    author: row.author,
    imageUrl: row.image_url,
    category: row.category,
    sourceName: row.source_name,
    geoLocation: row.geo_location,
    reactions: {
      fire: row.reaction_fire ?? 0,
      heart: row.reaction_heart ?? 0,
      mindblown: row.reaction_mindblown ?? 0,
      sad: row.reaction_sad ?? 0,
      angry: row.reaction_angry ?? 0,
    },
    shareCount: row.share_count ?? 0,
    fetchTimestamp: row.fetch_timestamp,
  }));

  const response = NextResponse.json({ articles, hasMore });

  response.headers.set(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate=300'
  );

  return response;
}


export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { articleId } = body as { articleId?: string };

    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { error } = await supabase.rpc('increment_share_count', { row_id: articleId }).maybeSingle();

    // Fallback: if RPC doesn't exist, do a manual increment
    if (error) {
      const { data: current } = await supabase
        .from('articles')
        .select('share_count')
        .eq('id', articleId)
        .single();

      const currentCount = current?.share_count ?? 0;

      await supabase
        .from('articles')
        .update({ share_count: currentCount + 1 })
        .eq('id', articleId);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
