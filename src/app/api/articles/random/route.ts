import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { Article } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const excludeParam = searchParams.get('exclude') ?? '';

  const excludeIds = excludeParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const supabase = getServerSupabase();

  // Fetch all article IDs, excluding the provided ones
  let query = supabase.from('articles').select('id');

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: idRows, error: idError } = await query;

  if (idError) {
    return NextResponse.json({ error: idError.message }, { status: 500 });
  }

  if (!idRows || idRows.length === 0) {
    return NextResponse.json(
      { error: 'No articles available' },
      { status: 404 }
    );
  }

  // Pick a random ID
  const randomIndex = Math.floor(Math.random() * idRows.length);
  const randomId = idRows[randomIndex].id;

  // Fetch the full article
  const { data: row, error: articleError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', randomId)
    .single();

  if (articleError || !row) {
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }

  const article: Article = {
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
  };

  return NextResponse.json({ article });
}
