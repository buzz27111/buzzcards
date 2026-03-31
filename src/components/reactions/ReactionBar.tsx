'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmojiType, ReactionCounts } from '@/lib/types';

const EMOJIS: { type: EmojiType; label: string }[] = [
  { type: 'fire', label: '🔥' },
  { type: 'heart', label: '❤️' },
  { type: 'mindblown', label: '🤯' },
  { type: 'sad', label: '😢' },
  { type: 'angry', label: '😡' },
];

export function getFingerprint(): string {
  const key = 'buzzcards_fingerprint';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

export function getStoredReactions(articleId: string, fingerprint: string): EmojiType[] {
  try {
    const raw = localStorage.getItem(`reactions_${articleId}_${fingerprint}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function storeReactions(articleId: string, fingerprint: string, reactions: EmojiType[]) {
  localStorage.setItem(`reactions_${articleId}_${fingerprint}`, JSON.stringify(reactions));
}

/** Format large numbers: 1200 → "1.2k", 15000 → "15k" */
function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

/** Generate a seeded random number from a string (deterministic per article+emoji) */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Generate fake base counts for an article (deterministic so they don't jump on re-render) */
function generateFakeCounts(articleId: string): ReactionCounts {
  return {
    fire: 500 + (seededRandom(articleId + 'fire') % 8000),
    heart: 300 + (seededRandom(articleId + 'heart') % 5000),
    mindblown: 100 + (seededRandom(articleId + 'mindblown') % 3000),
    sad: 50 + (seededRandom(articleId + 'sad') % 1500),
    angry: 30 + (seededRandom(articleId + 'angry') % 1000),
  };
}

interface ReactionBarProps {
  articleId: string;
  initialReactions: ReactionCounts;
  initialUserReactions?: EmojiType[];
}

export default function ReactionBar({ articleId, initialReactions, initialUserReactions }: ReactionBarProps) {
  // Seed fake counts based on articleId (deterministic)
  const [fakeCounts] = useState<ReactionCounts>(() => generateFakeCounts(articleId));
  const [tickOffset, setTickOffset] = useState<ReactionCounts>({ fire: 0, heart: 0, mindblown: 0, sad: 0, angry: 0 });
  const [counts, setCounts] = useState<ReactionCounts>(initialReactions);
  const [userReactions, setUserReactions] = useState<EmojiType[]>(initialUserReactions ?? []);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fp = getFingerprint();
    const stored = getStoredReactions(articleId, fp);
    if (stored.length > 0 && !initialUserReactions?.length) {
      setUserReactions(stored);
    }
  }, [articleId, initialUserReactions]);

  // Simulate live engagement — randomly tick up counts every 3-8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTickOffset((prev) => {
        const emojiKeys: EmojiType[] = ['fire', 'heart', 'mindblown', 'sad', 'angry'];
        const next = { ...prev };
        // Randomly bump 1-2 emojis
        const bumps = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < bumps; i++) {
          const key = emojiKeys[Math.floor(Math.random() * emojiKeys.length)];
          next[key] += 1 + Math.floor(Math.random() * 3);
        }
        return next;
      });
    }, 3000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, []);

  // Merge: real DB counts + fake base + live ticks
  const displayCounts: ReactionCounts = {
    fire: counts.fire + fakeCounts.fire + tickOffset.fire,
    heart: counts.heart + fakeCounts.heart + tickOffset.heart,
    mindblown: counts.mindblown + fakeCounts.mindblown + tickOffset.mindblown,
    sad: counts.sad + fakeCounts.sad + tickOffset.sad,
    angry: counts.angry + fakeCounts.angry + tickOffset.angry,
  };

  const toggle = useCallback(async (emoji: EmojiType) => {
    if (pending) return;
    setPending(true);

    const fp = getFingerprint();
    const isActive = userReactions.includes(emoji);

    // Optimistic update
    const newUserReactions = isActive
      ? userReactions.filter((e) => e !== emoji)
      : [...userReactions, emoji];
    const newCounts = {
      ...counts,
      [emoji]: isActive ? Math.max(0, counts[emoji] - 1) : counts[emoji] + 1,
    };

    setUserReactions(newUserReactions);
    setCounts(newCounts);
    storeReactions(articleId, fp, newUserReactions);

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, emoji, fingerprint: fp }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reactions) {
          setCounts(data.reactions);
        }
      } else {
        // Revert on failure
        setUserReactions(userReactions);
        setCounts(counts);
        storeReactions(articleId, fp, userReactions);
      }
    } catch {
      // Revert on error
      setUserReactions(userReactions);
      setCounts(counts);
      storeReactions(articleId, fp, userReactions);
    } finally {
      setPending(false);
    }
  }, [articleId, counts, userReactions, pending]);

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Article reactions">
      {EMOJIS.map(({ type, label }) => {
        const active = userReactions.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            disabled={pending}
            aria-pressed={active}
            aria-label={`React with ${type}`}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
              active
                ? 'bg-foreground/15 ring-1 ring-foreground/30'
                : 'bg-foreground/5 hover:bg-foreground/10'
            } disabled:opacity-50`}
          >
            <span>{label}</span>
            <span className="text-xs text-foreground/60">{formatCount(displayCounts[type])}</span>
          </button>
        );
      })}
    </div>
  );
}
