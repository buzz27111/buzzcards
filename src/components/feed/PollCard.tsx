'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Poll } from '@/lib/types';
import { getFingerprint } from '@/components/reactions/ReactionBar';

interface PollCardProps {
  poll: Poll;
}

/** localStorage key for tracking which polls a user has voted on */
function votedPollKey(pollId: string, fingerprint: string): string {
  return `poll_voted_${pollId}_${fingerprint}`;
}

export default function PollCard({ poll }: PollCardProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<{ optionIndex: number; votes: number; percentage: number }[] | null>(null);
  const [totalVotes, setTotalVotes] = useState(poll.totalVotes);
  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check localStorage on mount to see if user already voted
  useEffect(() => {
    const fp = getFingerprint();
    const stored = localStorage.getItem(votedPollKey(poll.id, fp));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResults(parsed.results);
        setTotalVotes(parsed.totalVotes);
        setHasVoted(true);
      } catch {
        // Corrupted data — allow re-vote
      }
    }
  }, [poll.id]);

  const handleVote = useCallback(async (optionIndex: number) => {
    if (voting || hasVoted) return;
    setVoting(true);

    const fp = getFingerprint();

    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: poll.id, optionIndex, fingerprint: fp }),
      });

      if (res.ok) {
        const data: { results: { optionIndex: number; votes: number; percentage: number }[]; totalVotes: number } = await res.json();
        setResults(data.results);
        setTotalVotes(data.totalVotes);
        setHasVoted(true);
        // Persist vote in localStorage to prevent re-voting
        localStorage.setItem(votedPollKey(poll.id, fp), JSON.stringify(data));
      } else if (res.status === 409) {
        // Already voted — show current results from poll data
        const fallbackResults = poll.options.map((_, idx) => ({
          optionIndex: idx,
          votes: poll.votes[String(idx)] ?? 0,
          percentage: poll.totalVotes > 0
            ? Math.round(((poll.votes[String(idx)] ?? 0) / poll.totalVotes) * 100)
            : 0,
        }));
        setResults(fallbackResults);
        setTotalVotes(poll.totalVotes);
        setHasVoted(true);
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setVoting(false);
    }
  }, [voting, hasVoted, poll]);

  const handleShare = useCallback(async () => {
    const text = `📊 Poll: ${poll.question}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [poll.question]);

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col gap-3 p-4">
        {/* Poll header */}
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-400">
            Poll
          </span>
        </div>

        {/* Question */}
        <p className="text-base font-bold leading-snug text-foreground">
          {poll.question}
        </p>

        {/* Options — before voting: clickable buttons, after voting: result bars */}
        <div className="flex flex-col gap-2">
          {poll.options.map((option, idx) => {
            if (hasVoted && results) {
              const result = results.find((r) => r.optionIndex === idx);
              const pct = result?.percentage ?? 0;
              return (
                <div key={idx} className="relative overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2">
                  {/* Percentage bar background */}
                  <div
                    className="absolute inset-y-0 left-0 bg-purple-500/15 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="text-sm text-foreground/80">{option}</span>
                    <span className="text-xs font-semibold text-foreground/60">{pct}%</span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleVote(idx)}
                disabled={voting}
                className="rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/10 disabled:opacity-50"
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Footer: total votes + share */}
        <div className="flex items-center justify-between text-xs text-foreground/50">
          <span>{totalVotes.toLocaleString()} vote{totalVotes !== 1 ? 's' : ''}</span>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors hover:bg-foreground/10"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
