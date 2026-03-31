'use client';

import type { LeaderboardEntry } from '@/lib/types';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  if (leaderboard.length === 0) return null;

  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/70 p-4 backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
        🏆 Daily Leaderboard
      </h3>

      <ul className="space-y-2">
        {leaderboard.map((entry, i) => {
          const rank = i + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
          const truncatedFp = entry.fingerprint.slice(0, 8) + '…';
          const time = new Date(entry.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <li
              key={entry.fingerprint}
              className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-center">{medal}</span>
                <span className="font-mono text-foreground/70">{truncatedFp}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold">{entry.score}/5</span>
                <span className="text-xs text-foreground/50">{time}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
