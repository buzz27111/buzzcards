import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://buzzcards.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${SITE_URL}/quiz`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/map`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/compare`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ];

  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const supabase = createClient(url, key);
      const { data: articles } = await supabase
        .from('articles')
        .select('id, pub_date')
        .order('pub_date', { ascending: false });

      if (articles) {
        for (const article of articles) {
          entries.push({
            url: `${SITE_URL}/article/${article.id}`,
            lastModified: new Date(article.pub_date),
            changeFrequency: 'weekly',
            priority: 0.5,
          });
        }
      }

      // Mini articles (user-created buzzes)
      const { data: buzzes } = await supabase
        .from('mini_posts')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (buzzes) {
        for (const buzz of buzzes) {
          entries.push({
            url: `${SITE_URL}/buzz/${buzz.id}`,
            lastModified: new Date(buzz.created_at),
            changeFrequency: 'weekly',
            priority: 0.4,
          });
        }
      }
    }
  } catch {
    // Sitemap still returns static pages if DB is unavailable
  }

  return entries;
}
