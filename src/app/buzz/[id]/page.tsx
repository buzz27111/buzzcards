import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import BuzzPageClient from './BuzzPageClient';
import type { Category, MiniPost } from '@/lib/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://buzzcards.app';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );
}

async function getPost(id: string) {
  const sb = getSupabase();
  const { data } = await sb.from('mini_posts')
    .select('*, profiles!mini_posts_user_id_fkey(display_name, avatar_url, bio, interests)')
    .eq('id', id).single();
  return data;
}

async function getRelated(category: string, tags: string[], excludeId: string) {
  const sb = getSupabase();
  const { data } = await sb.from('mini_posts')
    .select('*, profiles!mini_posts_user_id_fkey(display_name, avatar_url)')
    .eq('category', category).neq('id', excludeId)
    .order('created_at', { ascending: false }).limit(4);
  return data || [];
}

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'Article Not Found — BuzzCards' };
  const profile = post.profiles as Record<string,unknown> | null;
  const author = (profile?.display_name as string) || 'BuzzCards User';
  const desc = post.content.slice(0, 160);
  const tags = (post.tags as string[]);
  const url = `${SITE}/buzz/${id}`;
  return {
    title: `${author}: "${desc.slice(0,60)}..." — BuzzCards`,
    description: `${desc} ${tags.map(t=>`#${t}`).join(' ')}`,
    keywords: tags,
    authors: [{ name: author }],
    openGraph: { title: `${author} on BuzzCards`, description: desc, url, type: 'article',
      tags, publishedTime: post.created_at, authors: [author], siteName: 'BuzzCards' },
    twitter: { card: 'summary', title: `${author} on BuzzCards`, description: desc },
    alternates: { canonical: url },
  };
}

export default async function BuzzPage({ params }: Props) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pt-20 pb-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-foreground mb-2">Article not found</h1>
          <p className="text-sm text-foreground/50 mb-4">This article may have been deleted or doesn't exist.</p>
          <Link href="/" className="rounded-full bg-purple-500 px-5 py-2 text-sm font-semibold text-white">Back to feed</Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const profile = post.profiles as Record<string,unknown> | null;
  const author = (profile?.display_name as string) || 'BuzzCards User';
  const authorAvatar = (profile?.avatar_url as string) || null;
  const authorBio = (profile?.bio as string) || null;
  const authorInterests = (profile?.interests as string[]) || [];
  const tags = post.tags as string[];
  const url = `${SITE}/buzz/${id}`;

  const mapped: MiniPost = {
    id: post.id, userId: post.user_id, content: post.content,
    tags, category: post.category as Category,
    upvotes: post.upvotes ?? 0, downvotes: post.downvotes ?? 0,
    createdAt: post.created_at,
    authorName: author, authorAvatar: authorAvatar ?? undefined,
    rebuzzOf: post.rebuzz_of, rebuzzCount: post.rebuzz_count ?? 0,
  };

  const related = await getRelated(post.category, tags, id);
  const relatedMapped: MiniPost[] = related.map((r: Record<string,unknown>) => {
    const rp = r.profiles as Record<string,unknown> | null;
    return {
      id: r.id as string, userId: r.user_id as string, content: r.content as string,
      tags: r.tags as string[], category: r.category as Category,
      upvotes: (r.upvotes as number) ?? 0, downvotes: (r.downvotes as number) ?? 0,
      createdAt: r.created_at as string,
      authorName: (rp?.display_name as string) ?? undefined,
      authorAvatar: (rp?.avatar_url as string) ?? undefined,
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.content.slice(0, 110), description: post.content,
    author: { '@type': 'Person', name: author },
    datePublished: post.created_at,
    publisher: { '@type': 'Organization', name: 'BuzzCards' },
    mainEntityOfPage: url, keywords: tags.join(', '), articleSection: post.category,
  };

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-20 pb-20">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main content — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <article>
              {/* Article header */}
              <header className="mb-4 flex items-center gap-3">
                {authorAvatar ? <img src={authorAvatar} alt={author} className="h-12 w-12 rounded-full" />
                : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-lg font-bold text-white">{author[0].toUpperCase()}</div>}
                <div>
                  <p className="font-semibold text-foreground">{author}</p>
                  <time dateTime={post.created_at} className="text-xs text-foreground/50">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </header>

              {/* Article content */}
              <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6">
                <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map(t => <Link key={t} href={`/?tag=${t}`} className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/25 transition-colors">#{t}</Link>)}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-foreground/40">
                  <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase">{post.category}</span>
                  {post.rebuzz_of && <span>🔄 Rebuzzed</span>}
                </div>
              </section>
            </article>

            {/* Interactive section (client component) */}
            <BuzzPageClient post={mapped} url={url} />

            {/* Related articles */}
            {relatedMapped.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground/70">More in {post.category}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {relatedMapped.map(r => (
                    <Link key={r.id} href={`/buzz/${r.id}`} className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 transition-colors hover:bg-foreground/5">
                      <div className="mb-1 flex items-center gap-2 text-xs text-foreground/50">
                        {r.authorAvatar && <img src={r.authorAvatar} alt="" className="h-4 w-4 rounded-full" />}
                        <span>{r.authorName || 'Someone'}</span>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-3">{r.content}</p>
                      <div className="mt-2 flex gap-1">{r.tags.slice(0,3).map(t => <span key={t} className="text-[10px] text-blue-400">#{t}</span>)}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — 1 col */}
          <aside className="space-y-4">
            {/* Author card */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">About the author</h3>
              <div className="flex items-center gap-3 mb-3">
                {authorAvatar ? <img src={authorAvatar} alt={author} className="h-10 w-10 rounded-full" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 font-bold text-white">{author[0].toUpperCase()}</div>}
                <div>
                  <p className="text-sm font-semibold text-foreground">{author}</p>
                  {authorBio && <p className="text-xs text-foreground/50 line-clamp-2">{authorBio}</p>}
                </div>
              </div>
              {authorInterests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {authorInterests.slice(0,6).map(i => <span key={i} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] text-purple-300">{i}</span>)}
                </div>
              )}
            </div>

            {/* Tags on this article */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => <Link key={t} href={`/?tag=${t}`} className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-400 hover:bg-blue-500/25">#{t}</Link>)}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Explore</h3>
              <div className="space-y-2">
                <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5">🏠 Home Feed</Link>
                <Link href="/quiz" className="block rounded-lg px-3 py-2 te
xt-sm text-foreground/70 hover:bg-foreground/5">🧠 Daily Quiz</Link>
                <Link href="/map" className="block rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5">🗺️ News Map</Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
