import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { Article } from '@/lib/types';
import ReactionBar from '@/components/reactions/ReactionBar';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';

async function getArticle(id: string): Promise<Article | null> {
  try {
    const { getServerSupabase } = await import('@/lib/supabase');
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      summary: data.summary,
      sourceUrl: data.source_url,
      pubDate: data.pub_date,
      author: data.author,
      imageUrl: data.image_url,
      category: data.category,
      sourceName: data.source_name,
      geoLocation: data.geo_location,
      reactions: {
        fire: data.reaction_fire ?? 0,
        heart: data.reaction_heart ?? 0,
        mindblown: data.reaction_mindblown ?? 0,
        sad: data.reaction_sad ?? 0,
        angry: data.reaction_angry ?? 0,
      },
      shareCount: data.share_count ?? 0,
      fetchTimestamp: data.fetch_timestamp,
    };
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return { title: 'Article Not Found — BuzzCards' };
  }

  const description = article.summary ?? article.description ?? '';
  const images = article.imageUrl ? [article.imageUrl] : [];

  return {
    title: `${article.title} — BuzzCards`,
    description,
    openGraph: {
      title: article.title,
      description,
      images,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pt-20 pb-20">
          <p className="text-foreground/60">Article not found.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const displayText = article.summary ?? article.description ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: displayText,
    image: article.imageUrl ?? undefined,
    datePublished: article.pubDate,
    author: article.author
      ? { '@type': 'Person', name: article.author }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: article.sourceName,
    },
    mainEntityOfPage: article.sourceUrl,
  };

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 pt-20 pb-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article>
          <header className="mb-6">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              {article.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foreground/60">
              <span className="font-medium">{article.sourceName}</span>
              <span>·</span>
              <time dateTime={article.pubDate}>
                {new Date(article.pubDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {article.author && (
                <>
                  <span>·</span>
                  <span>{article.author}</span>
                </>
              )}
            </div>
          </header>

          {article.imageUrl && (
            <section className="mb-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 672px"
                  className="object-cover"
                  priority
                />
              </div>
            </section>
          )}

          <section className="mb-6">
            <p className="text-base leading-relaxed text-foreground/80">
              {displayText}
            </p>
          </section>

          <section className="mb-6">
            <ReactionBar articleId={article.id} initialReactions={article.reactions} />
          </section>

          <section>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:underline"
            >
              Read full article on {article.sourceName} →
            </a>
          </section>
        </article>

        <nav className="mt-8">
          <Link
            href="/"
            className="text-sm text-foreground/50 hover:text-foreground/80"
          >
            ← Back to feed
          </Link>
        </nav>
      </main>

      <BottomNav />
    </div>
  );
}
