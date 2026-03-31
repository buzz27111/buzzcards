'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Article, Category, Poll, MiniPost } from '@/lib/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CategoryChips from '@/components/layout/CategoryChips';
import FeedList from '@/components/feed/FeedList';
import MiniPostCard from '@/components/feed/MiniPostCard';
import BottomNav from '@/components/layout/BottomNav';
import OfflineBanner from '@/components/common/OfflineBanner';
import ComposeModal from '@/components/compose/ComposeModal';

const SurpriseMe = dynamic(() => import('@/components/surprise/SurpriseMe'), { ssr: false });
const SwipeMode = dynamic(() => import('@/components/swipe/SwipeMode'), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" /></div>,
});

type FeedTab = 'my-feed' | 'current-world';

interface HomeFeedProps {
  initialArticles: Article[];
  initialHasMore: boolean;
}

export default function HomeFeed({ initialArticles, initialHasMore }: HomeFeedProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('current-world');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isSwipeMode, setIsSwipeMode] = useState(false);
  const [miniPosts, setMiniPosts] = useState<MiniPost[]>([]);
  const [miniLoading, setMiniLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    fetch('/api/polls/active')
      .then((res) => (res.ok ? res.json() : { polls: [] }))
      .then((data: { polls: Poll[] }) => setPolls(data.polls))
      .catch(() => {});
  }, []);

  // Fetch mini posts for "My Feed" tab
  const fetchMyFeed = useCallback(async () => {
    if (!user) return;
    setMiniLoading(true);
    try {
      const client = getAuthClient();
      const { data: profile } = await client.from('profiles').select('interests').eq('id', user.id).single();
      const interests: string[] = profile?.interests || [];

      // Fetch all recent mini posts (includes user's own + others)
      const { data: posts } = await client
        .from('mini_posts')
        .select('*, profiles!mini_posts_user_id_fkey(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (posts) {
        const { data: votes } = await client
          .from('mini_post_votes')
          .select('mini_post_id, vote_type')
          .eq('user_id', user.id);
        const voteMap = new Map((votes || []).map(v => [v.mini_post_id, v.vote_type]));

        const mapped: MiniPost[] = posts
          .filter((p: Record<string, unknown>) => {
            // Always show user's own posts
            if ((p.user_id as string) === user.id) return true;
            // Show others' posts where any tag matches user interests
            const postTags = p.tags as string[];
            return interests.length > 0 && postTags.some(tag =>
              interests.some(i => i.toLowerCase() === tag.toLowerCase())
            );
          })
          .map((p: Record<string, unknown>) => {
            const prof = p.profiles as Record<string, unknown> | null;
            return {
              id: p.id as string,
              userId: p.user_id as string,
              content: p.content as string,
              tags: p.tags as string[],
              category: p.category as Category,
              upvotes: (p.upvotes as number) ?? 0,
              downvotes: (p.downvotes as number) ?? 0,
              createdAt: p.created_at as string,
              authorName: (prof?.display_name as string) ?? null,
              authorAvatar: (prof?.avatar_url as string) ?? null,
              userVote: (voteMap.get(p.id as string) as 'up' | 'down') ?? null,
              rebuzzOf: (p.rebuzz_of as string) ?? null,
              rebuzzCount: (p.rebuzz_count as number) ?? 0,
            };
          });
        setMiniPosts(mapped);
      }
    } catch { /* ignore */ }
    finally { setMiniLoading(false); }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-feed' && user) fetchMyFeed();
  }, [activeTab, user, fetchMyFeed]);

  const handleCategorySelect = useCallback(async (category: Category | null) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '20' });
      if (category) params.set('category', category);
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const data: { articles: Article[]; hasMore: boolean } = await res.json();
      setArticles(data.articles);
      setHasMore(data.hasMore);
    } catch {} finally { setLoading(false); }
  }, []);

  const feedArticles = selectedCategory !== null || articles !== initialArticles ? articles : initialArticles;
  const feedHasMore = selectedCategory !== null || articles !== initialArticles ? hasMore : initialHasMore;

  return (
    <div className="min-h-dvh bg-background">
      <OfflineBanner />
      <Navbar onSwipeModeToggle={() => setIsSwipeMode(p => !p)} isSwipeMode={isSwipeMode} onCompose={() => setComposeOpen(true)} />
      <Sidebar selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />

      {isSwipeMode ? (
        <SwipeMode articles={feedArticles} />
      ) : (
        <main className="pt-14 pb-16 md:pb-0 lg:ml-56 lg:mr-64">
          {/* Tab bar */}
          <div className="border-b border-foreground/10">
            <div className="mx-auto flex max-w-2xl md:max-w-none lg:max-w-2xl">
              <button onClick={() => setActiveTab('my-feed')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'my-feed' ? 'border-b-2 border-purple-500 text-foreground' : 'text-foreground/50 hover:text-foreground/70'}`}>
                My Feed
              </button>
              <button onClick={() => setActiveTab('current-world')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'current-world' ? 'border-b-2 border-purple-500 text-foreground' : 'text-foreground/50 hover:text-foreground/70'}`}>
                Current World
              </button>
            </div>
          </div>

          {activeTab === 'current-world' && (
            <>
              <CategoryChips selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
              <div className="mx-auto max-w-2xl px-4 py-4 md:max-w-none lg:max-w-2xl">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1">
                    {[0,1,2].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-foreground/5" />)}
                  </div>
                ) : (
                  <FeedList initialArticles={feedArticles} initialHasMore={feedHasMore} category={selectedCategory} polls={polls} />
                )}
              </div>
            </>
          )}

          {activeTab === 'my-feed' && (
            <div className="mx-auto max-w-2xl px-4 py-4 md:max-w-none lg:max-w-2xl">
              {!user ? (
                <div className="py-12 text-center text-foreground/50">
                  <p className="mb-2">Sign in to see your personalized feed</p>
                  <p className="text-xs">Mini posts matching your interests will appear here</p>
                </div>
              ) : miniLoading ? (
                <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-foreground/5" />)}</div>
              ) : miniPosts.length === 0 ? (
                <div className="py-12 text-center text-foreground/50">
                  <p className="mb-2">No posts matching your interests yet</p>
                  <p className="text-xs">Set up your interests in your profile, or check back later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {miniPosts.map(post => <MiniPostCard key={post.id} post={post} onRebuzz={() => fetchMyFeed()} />)}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <SurpriseMe />
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => { if (activeTab === 'my-feed') fetchMyFeed(); }} />
      {/* Floating compose button — mobile */}
      {user && (
        <button onClick={() => setComposeOpen(true)}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500 text-2xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden">
          ✏️
        </button>
      )}
      <BottomNav />
    </div>
  );
}
