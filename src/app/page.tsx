import HomeFeed from '@/components/feed/HomeFeed';
import type { Article } from '@/lib/types';

async function getInitialArticles(): Promise<{ articles: Article[]; hasMore: boolean }> {
  try {
    const { getServerSupabase } = await import('@/lib/supabase');
    const supabase = getServerSupabase();

    const limit = 20;
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('pub_date', { ascending: false })
      .range(0, limit); // fetch limit+1 to check hasMore

    if (error || !data) {
      return { articles: [], hasMore: false };
    }

    const hasMore = data.length > limit;
    const rows = hasMore ? data.slice(0, limit) : data;

    const articles: Article[] = rows.map((row) => ({
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

    return { articles, hasMore };
  } catch {
    // Gracefully handle missing env vars during build or when Supabase is unavailable
    return { articles: [], hasMore: false };
  }
}

export default async function Home() {
  const { articles, hasMore } = await getInitialArticles();

  return <HomeFeed initialArticles={articles} initialHasMore={hasMore} />;
}
