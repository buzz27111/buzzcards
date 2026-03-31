'use client';

import { useState, useCallback, useEffect } from 'react';
import type { MiniPost } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/constants';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@/lib/auth';

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}

/** Deterministic seed from post ID for consistent fake base counts */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface MiniPostCardProps {
  post: MiniPost;
  onDelete?: (postId: string) => void;
  onRebuzz?: (post: MiniPost) => void;
}

export default function MiniPostCard({ post, onDelete, onRebuzz }: MiniPostCardProps) {
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(post.userVote ?? null);
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rebuzzing, setRebuzzing] = useState(false);

  const isOwner = user?.id === post.userId;

  // Fake engagement: time-based — grows gradually, not instant
  const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000*60*60));
  const [fakeBoost] = useState(() => {
    if (ageHours < 0.5) return 0; // first 30 min: nothing
    if (ageHours < 2) return Math.floor(ageHours * 2); // 0-4 in first 2 hours
    if (ageHours < 24) return 4 + Math.floor((ageHours - 2) * 1.5); // ~37 by end of day 1
    return 37 + Math.floor((ageHours - 24) * 0.3 + (seededRandom(post.id) % 20)); // slow growth + variance
  });
  const [tickExtra, setTickExtra] = useState(0);

  useEffect(() => {
    // Start ticking after a 2-3 min random delay, then bump every 4-10 seconds
    const initialDelay = 120_000 + Math.random() * 60_000; // 2-3 min
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        setTickExtra(prev => prev + 1 + Math.floor(Math.random() * 3));
      }, 4000 + Math.random() * 6000);
      return () => clearInterval(interval);
    }, initialDelay);
    return () => clearTimeout(startTimer);
  }, []);

  const displayUpvotes = upvotes + fakeBoost + tickExtra;
  const displayDownvotes = downvotes + Math.floor(fakeBoost * 0.08);

  const colors = CATEGORY_COLORS[post.category];
  const catLabel = post.category.charAt(0).toUpperCase() + post.category.slice(1);

  const handleVote = useCallback(async (type: 'up' | 'down') => {
    if (!user || voting) return;
    setVoting(true);
    const client = getAuthClient();
    const prevVote = userVote;

    // Optimistic update
    if (prevVote === type) {
      // Remove vote
      setUserVote(null);
      if (type === 'up') setUpvotes(v => v - 1);
      else setDownvotes(v => v - 1);
    } else {
      // Change or add vote
      if (prevVote === 'up') setUpvotes(v => v - 1);
      if (prevVote === 'down') setDownvotes(v => v - 1);
      setUserVote(type);
      if (type === 'up') setUpvotes(v => v + 1);
      else setDownvotes(v => v + 1);
    }

    try {
      if (prevVote === type) {
        // Delete vote
        await client.from('mini_post_votes').delete().eq('mini_post_id', post.id).eq('user_id', user.id);
        await client.from('mini_posts').update({
          [type === 'up' ? 'upvotes' : 'downvotes']: type === 'up' ? Math.max(0, upvotes - 1) : Math.max(0, downvotes - 1),
        }).eq('id', post.id);
      } else {
        // Upsert vote
        if (prevVote) {
          await client.from('mini_post_votes').update({ vote_type: type }).eq('mini_post_id', post.id).eq('user_id', user.id);
          // Adjust old vote count
          await client.from('mini_posts').update({
            [prevVote === 'up' ? 'upvotes' : 'downvotes']: prevVote === 'up' ? Math.max(0, upvotes - 1) : Math.max(0, downvotes - 1),
            [type === 'up' ? 'upvotes' : 'downvotes']: type === 'up' ? upvotes + 1 : downvotes + 1,
          }).eq('id', post.id);
        } else {
          await client.from('mini_post_votes').insert({ mini_post_id: post.id, user_id: user.id, vote_type: type });
          await client.from('mini_posts').update({
            [type === 'up' ? 'upvotes' : 'downvotes']: type === 'up' ? upvotes + 1 : downvotes + 1,
          }).eq('id', post.id);
        }
      }
    } catch {
      // Revert on error
      setUserVote(prevVote);
      setUpvotes(post.upvotes);
      setDownvotes(post.downvotes);
    } finally {
      setVoting(false);
    }
  }, [user, voting, userVote, post, upvotes, downvotes]);

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/70 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <button onClick={() => handleVote('up')} disabled={!user || voting}
            className={`rounded p-1 transition-colors ${userVote === 'up' ? 'text-green-400' : 'text-foreground/40 hover:text-green-400'} disabled:opacity-40`}
            aria-label="Upvote">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 15l7-7 7 7" /></svg>
          </button>
          <span className="text-xs font-semibold text-foreground/60">{formatCount(displayUpvotes - displayDownvotes)}</span>
          <button onClick={() => handleVote('down')} disabled={!user || voting}
            className={`rounded p-1 transition-colors ${userVote === 'down' ? 'text-red-400' : 'text-foreground/40 hover:text-red-400'} disabled:opacity-40`}
            aria-label="Downvote">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-foreground/50">
            {post.authorAvatar && <img src={post.authorAvatar} alt="" className="h-5 w-5 rounded-full" />}
            <span className="font-medium text-foreground/70">{post.authorName || 'Anonymous'}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white" style={{ backgroundColor: colors.light }}>{catLabel}</span>
            {isOwner && onDelete && (
              <button
                onClick={async () => {
                  if (deleting) return;
                  setDeleting(true);
                  const client = getAuthClient();
                  await client.from('mini_posts').delete().eq('id', post.id);
                  onDelete(post.id);
                }}
                disabled={deleting}
                className="ml-auto rounded px-1.5 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                aria-label="Delete post"
              >
                {deleting ? '...' : '🗑 Delete'}
              </button>
            )}
          </div>
          <a href={`/buzz/${post.id}`} className="block text-sm leading-relaxed text-foreground/80 hover:text-foreground">{post.content}</a>

          {/* Embedded original post for rebuzzes */}
          {post.originalPost && (
            <div className="mt-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-foreground/50">
                {post.originalPost.authorAvatar && <img src={post.originalPost.authorAvatar} alt="" className="h-4 w-4 rounded-full" />}
                <span className="font-medium text-foreground/60">{post.originalPost.authorName || 'Someone'}</span>
              </div>
              <p className="text-xs leading-relaxed text-foreground/60">{post.originalPost.content}</p>
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <div className="flex flex-wrap gap-1 flex-1">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-blue-400">#{tag}</span>
              ))}
            </div>
            {/* Rebuzz button */}
            {user && !isOwner && onRebuzz && (
              <button
                onClick={async () => {
                  if (rebuzzing) return;
                  setRebuzzing(true);
                  const client = getAuthClient();
                  // Create a rebuzz post
                  const { error: err } = await client.from('mini_posts').insert({
                    user_id: user.id,
                    content: post.content,
                    tags: post.tags,
                    category: post.category,
                    rebuzz_of: post.id,
                  });
                  if (!err) {
                    // Increment rebuzz count on original
                    await client.from('mini_posts').update({
                      rebuzz_count: (post.rebuzzCount || 0) + 1,
                    }).eq('id', post.id);
                    onRebuzz(post);
                  }
                  setRebuzzing(false);
                }}
                disabled={rebuzzing}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-foreground/50 transition-colors hover:bg-green-500/10 hover:text-green-400 disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {rebuzzing ? '...' : `Rebuzz${post.rebuzzCount ? ` · ${post.rebuzzCount}` : ''}`}
              </button>
            )}
            {/* Show rebuzz count for own posts */}
            {(isOwner || !onRebuzz) && (post.rebuzzCount || 0) > 0 && (
              <span className="text-[11px] text-foreground/40">🔄 {post.rebuzzCount} rebuzz{(post.rebuzzCount||0) > 1 ? 'es' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Rebuzz indicator at top */}
      {post.rebuzzOf && (
        <div className="mt-2 border-t border-foreground/5 pt-2 pl-12 text-[11px] text-foreground/40">
          🔄 Rebuzzed
        </div>
      )}
    </div>
  );
}
