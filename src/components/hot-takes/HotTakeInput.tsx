'use client';

import { useState } from 'react';
import { getFingerprint } from '@/components/reactions/ReactionBar';

interface HotTakeInputProps {
  articleId: string;
  onSubmitted?: () => void;
}

export default function HotTakeInput({ articleId, onSubmitted }: HotTakeInputProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const remaining = 140 - text.length;

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const fingerprint = getFingerprint();
      const res = await fetch('/api/hot-takes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, text: text.trim(), fingerprint }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit');
        return;
      }

      setText('');
      onSubmitted?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={140}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder="Drop a hot take…"
          aria-label="Hot take input"
          className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="rounded-lg bg-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/20 disabled:opacity-40"
        >
          Post
        </button>
      </div>
      <div className="flex items-center justify-between px-1 text-xs">
        <span className={remaining < 20 ? 'text-red-400' : 'text-foreground/40'}>
          {remaining}
        </span>
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
