import { NextResponse } from 'next/server';
import { scrapeAllFeeds } from '@/lib/scraper/scraper';
import { isDuplicate } from '@/lib/scraper/dedup';
import { summarizeArticle } from '@/lib/scraper/summarizer';
import { inferGeoLocation } from '@/lib/scraper/geo';
import { FEED_SOURCES } from '@/lib/constants';
import { getEnv } from '@/lib/env';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Validate CRON_SECRET
  const env = getEnv();
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();

  // 2. Scrape all feeds
  const rawArticles = await scrapeAllFeeds(FEED_SOURCES);
  const totalFetched = rawArticles.length;

  let duplicatesSkipped = 0;
  let newStored = 0;

  // 3. Process each article: dedup → summarize → store
  for (const article of rawArticles) {
    const duplicate = await isDuplicate(article);
    if (duplicate) {
      duplicatesSkipped++;
      continue;
    }

    const summary = await summarizeArticle(article.description);
    const geoLocation = inferGeoLocation(article);

    const { error } = await supabase.from('articles').insert({
      title: article.title,
      description: article.description,
      summary,
      source_url: article.sourceUrl,
      pub_date: article.pubDate.toISOString(),
      author: article.author,
      image_url: article.imageUrl,
      category: article.category,
      source_name: article.sourceName,
      geo_location: geoLocation,
    });

    if (error) {
      console.error(`[cron/scrape] Failed to insert article "${article.title}": ${error.message}`);
      continue;
    }

    newStored++;
  }

  // 4. Cleanup: delete articles older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: cleanedUp, error: cleanupError } = await supabase
    .from('articles')
    .delete({ count: 'exact' })
    .lt('created_at', sevenDaysAgo);

  if (cleanupError) {
    console.error(`[cron/scrape] Cleanup error: ${cleanupError.message}`);
  }

  return NextResponse.json({
    success: true,
    stats: {
      totalFetched,
      duplicatesSkipped,
      newStored,
      cleanedUp: cleanedUp ?? 0,
    },
  });
}
