'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HotTake } from '@/lib/types';
import { getFingerprint } from '@/components/reactions/ReactionBar';

interface HotTakeListProps {
  articleId: string;
  refreshKey?: number;
}

export default function HotTakeList({ articleId, refreshKey }: HotTakeListProps) {
  const [hotTakes, setHotTakes] = useState<HotTake[]>([]);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());

  const fetchHotTakes = useCallback(async () => {
    try {
      const res = await fetch(`/api/hot-takes?articleId=${articleId}`);
      if (res.ok) {
        const data: { hotTakes: HotTake[] } = await res.json();
        setHotTakes(data.hotTakes);
      }
    } catch {
      // silent
    }
  }, [articleId]);

  useEffect(() => {
    fetchHotTakes();
  }, [fetchHotTakes, refreshKey]);

  async function toggleUpvote(hotTakeId: string) {
    const fingerprint = getFingerprint();
    const wasUpvoted = upvoted.has(hotTakeId);

    // Optimistic update
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (wasUpvoted) next.delete(hotTakeId);
      else next.add(hotTakeId);
      return next;
    });
    setHotTakes((prev) =>
      prev.map((ht) =>
        ht.id === hotTakeId
          ? { ...ht, upvotes: ht.upvotes + (wasUpvoted ? -1 : 1) }
          : ht
      )
    );

    try {
      const res = await fetch('/api/hot-takes/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotTakeId, fingerprint }),
      });
      if (res.ok) {
        const data: { upvotes: number } = await res.json();
        setHotTakes((prev) =>
          prev.map((ht) => (ht.id === hotTakeId ? { ...ht, upvotes: data.upvotes } : ht))
        );
      }
    } catch {
      // Revert on error
      setUpvoted((prev) => {
        const next = new Set(prev);
        if (wasUpvoted) next.add(hotTakeId);
        else next.delete(hotTakeId);
        return next;
      });
      setHotTakes((prev) =>
        prev.map((ht) =>
          ht.id === hotTakeId
            ? { ...ht, upvotes: ht.upvotes + (wasUpvoted ? 1 : -1) }
            : ht
        )
      );
    }
  }

  if (hotTakes.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {hotTakes.map((ht) => (
        <div
          key={ht.id}
          className="flex items-start justify-between gap-2 rounded-lg bg-foreground/5 px-3 py-2 text-sm"
        >
          <p className="flex-1 text-foreground/80">{ht.text}</p>
          <button
            type="button"
            onClick={() => toggleUpvote(ht.id)}
            aria-pressed={upvoted.has(ht.id)}
            aria-label={`Upvote hot take: ${ht.upvotes}`}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
              upvoted.has(ht.id)
                ? 'bg-foreground/15 ring-1 ring-foreground/30'
                : 'bg-foreground/5 hover:bg-foreground/10'
            }`}
          >
            <span>▲</span>
            <span>{ht.upvotes}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
