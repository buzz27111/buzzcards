'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Article, Poll } from '@/lib/types';
import ArticleCard from '@/components/feed/ArticleCard';
import PollCard from '@/components/feed/PollCard';
import ReactionBar from '@/components/reactions/ReactionBar';
import LoadingSkeleton from '@/components/feed/LoadingSkeleton';

interface FeedListProps {
  initialArticles: Article[];
  initialHasMore: boolean;
  category?: string | null;
  polls?: Poll[];
}

export default function FeedList({ initialArticles, initialHasMore, category, polls = [] }: FeedListProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(2); // page 1 is initialArticles
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when category changes
  useEffect(() => {
    setArticles(initialArticles);
    setHasMore(initialHasMore);
    setPage(2);
  }, [initialArticles, initialHasMore, category]);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (category) {
        params.set('category', category);
      }

      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch articles');

      const data: { articles: Article[]; hasMore: boolean } = await res.json();
      setArticles((prev) => [...prev, ...data.articles]);
      setHasMore(data.hasMore);
      setPage((prev) => prev + 1);
    } catch {
      // Silently fail — user can scroll again to retry
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, category]);

  // IntersectionObserver to trigger fetch when sentinel is within 200px of viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: '0px 0px 200px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1">
      {articles.map((article, index) => {
        // 1-based position of the article in the list
        const position = index + 1;

        // Poll at every 10th position
        const showPoll = position % 10 === 0 && polls.length > 0;
        const pollIndex = Math.floor(position / 10) - 1;
        const poll = showPoll ? polls[pollIndex % polls.length] : null;

        return (
          <div key={article.id}>
            <div className="flex flex-col gap-2">
              <ArticleCard article={article} />
              <div className="px-1">
                <ReactionBar articleId={article.id} initialReactions={article.reactions} />
              </div>
            </div>

            {/* Poll card at every 10th position */}
            {poll && (
              <div className="mt-6">
                <PollCard poll={poll} />
              </div>
            )}
          </div>
        );
      })}

      {/* Loading state */}
      {loading && <div className="md:col-span-2 lg:col-span-1"><LoadingSkeleton /></div>}

      {/* Sentinel element for IntersectionObserver */}
      {hasMore && !loading && <div ref={sentinelRef} className="h-1 md:col-span-2 lg:col-span-1" />}

      {/* End of feed message */}
      {!hasMore && !loading && articles.length > 0 && (
        <div className="py-8 text-center text-sm text-foreground/50 md:col-span-2 lg:col-span-1">
          ✅ All caught up!
        </div>
      )}
    </div>
  );
}
