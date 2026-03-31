'use client';

/**
 * AdCard — placeholder ad unit styled to match ArticleCard dimensions,
 * border radius, padding, and font styling (Requirements 8.1, 8.2, 8.3).
 *
 * Uses the same rounded-2xl, border, padding, and text classes as ArticleCard
 * so it blends seamlessly into the feed.
 */
export default function AdCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col gap-2 p-4">
        {/* Sponsored label */}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
          Sponsored
        </span>

        {/* Placeholder ad area */}
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-foreground/5">
          <span className="text-sm text-foreground/30">Advertisement</span>
        </div>

        {/* Footer matching ArticleCard source row */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground/50">
          <span className="font-medium">Ad</span>
        </div>
      </div>
    </div>
  );
}
