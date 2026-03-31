'use client';

import { useState, useEffect } from 'react';
import type { LocalStreakData, StreakBadge } from '@/lib/types';
import { checkAndUpdateStreak } from '@/lib/streak';

const BADGE_LABELS: Record<StreakBadge, string> = {
  '3-day': '🥉', '7-day': '🥈', '14-day': '🥇', '30-day': '🏆', '100-day': '💎',
};

export default function StreakWidget() {
  const [data, setData] = useState<LocalStreakData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setData(checkAndUpdateStreak()); }, []);
  if (!data) return null;

  const share = () => {
    const text = `🔥 ${data.streakCount}-day streak on BuzzCards!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-sm font-bold text-foreground">{data.streakCount} day streak</p>
          <p className="text-[10px] text-foreground/50">Keep reading daily!</p>
        </div>
      </div>
      {data.badges.length > 0 && (
        <div className="flex gap-1 mb-2">
          {data.badges.map(b => (
            <span key={b} title={b} className="text-sm">{BADGE_LABELS[b]}</span>
          ))}
        </div>
      )}
      <button onClick={share}
        className="w-full rounded-lg bg-foreground/10 py-1.5 text-[11px] text-foreground/60 hover:bg-foreground/15">
        {copied ? '✓ Copied!' : '📋 Share streak'}
      </button>
    </div>
  );
}
