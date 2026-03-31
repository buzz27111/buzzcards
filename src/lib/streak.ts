import type { LocalStreakData, StreakBadge } from '@/lib/types';
import { getFingerprint } from '@/components/reactions/ReactionBar';

const STREAK_MILESTONES: { days: number; badge: StreakBadge }[] = [
  { days: 3, badge: '3-day' },
  { days: 7, badge: '7-day' },
  { days: 14, badge: '14-day' },
  { days: 30, badge: '30-day' },
  { days: 100, badge: '100-day' },
];

function getStorageKey(fingerprint: string): string {
  return `buzzcards_streak_${fingerprint}`;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function computeBadges(streakCount: number): StreakBadge[] {
  return STREAK_MILESTONES
    .filter((m) => streakCount >= m.days)
    .map((m) => m.badge);
}

export function checkAndUpdateStreak(): LocalStreakData {
  const fingerprint = getFingerprint();
  const key = getStorageKey(fingerprint);
  const today = getTodayDateString();

  let data: LocalStreakData;

  try {
    const raw = localStorage.getItem(key);
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null as unknown as LocalStreakData;
  }

  if (!data) {
    // First visit ever
    data = { fingerprint, lastVisit: today, streakCount: 1, badges: [] };
  } else if (data.lastVisit === today) {
    // Already visited today — no change
    return data;
  } else {
    const gap = daysBetween(data.lastVisit, today);
    if (gap === 1) {
      // Consecutive day
      data.streakCount += 1;
    } else {
      // Gap > 1 day — reset
      data.streakCount = 1;
    }
    data.lastVisit = today;
    data.fingerprint = fingerprint;
  }

  data.badges = computeBadges(data.streakCount);
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}
