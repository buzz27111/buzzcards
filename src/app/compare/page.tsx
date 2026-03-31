'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Article } from '@/lib/types';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import CompareView from '@/components/compare/CompareView';

export default function ComparePage() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get('articleId');

  const [article, setArticle] = useState<Article | null>(null);
  const [comparison, setComparison] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) {
      setError('No article selected for comparison.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/articles/compare?articleId=${encodeURIComponent(articleId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to load comparison');
        }
        return res.json();
      })
      .then((data: { article: Article; comparison: Article }) => {
        setArticle(data.article);
        setComparison(data.comparison);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [articleId]);

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pt-20 pb-20">
        <h1 className="mb-6 text-xl font-bold text-foreground">Both Sides</h1>

        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-foreground/5" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && article && comparison && (
          <CompareView article={article} comparison={comparison} />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
