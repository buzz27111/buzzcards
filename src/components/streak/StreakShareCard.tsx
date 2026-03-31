'use client';

import { useCallback } from 'react';
import type { LocalStreakData } from '@/lib/types';

interface StreakShareCardProps {
  streakData: LocalStreakData;
}

export default function StreakShareCard({ streakData }: StreakShareCardProps) {
  const shareText = `🔥 I'm on a ${streakData.streakCount}-day streak on BuzzCards!${
    streakData.badges.length > 0
      ? ` Badges earned: ${streakData.badges.join(', ')}`
      : ''
  }`;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My BuzzCards Streak', text: shareText });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      alert('Streak copied to clipboard!');
    } catch {
      // Clipboard API not available
    }
  }, [shareText]);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-foreground/10 px-3 py-1.5">
      <span className="text-xs text-foreground/70 truncate max-w-[200px]">
        {shareText}
      </span>
      <button
        type="button"
        onClick={handleShare}
        className="shrink-0 rounded-md bg-foreground/15 px-2 py-1 text-xs hover:bg-foreground/25 transition-colors"
        aria-label="Copy or share streak"
      >
        📋
      </button>
    </div>
  );
}
