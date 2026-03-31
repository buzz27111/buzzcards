'use client';

import type { Article } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/constants';

interface CompareViewProps {
  article: Article;
  comparison: Article;
}

function PerspectiveCard({ article }: { article: Article }) {
  const colors = CATEGORY_COLORS[article.category];
  const categoryLabel = article.category.charAt(0).toUpperCase() + article.category.slice(1);
  const displayText = article.summary ?? article.description ?? '';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-background/70 p-5 backdrop-blur-sm">
      {/* Source name + category badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{article.sourceName}</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: colors.light }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base font-bold leading-snug text-foreground hover:underline"
      >
        {article.title}
      </a>

      {/* Summary */}
      {displayText && (
        <p className="text-sm leading-relaxed text-foreground/70">{displayText}</p>
      )}
    </div>
  );
}

export default function CompareView({ article, comparison }: CompareViewProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <PerspectiveCard article={article} />
      {/* Visual divider — horizontal on mobile, vertical on desktop */}
      <div className="hidden md:absolute md:left-1/2 md:top-0 md:block md:h-full md:w-px md:bg-foreground/10" />
      <div className="mx-auto h-px w-3/4 bg-foreground/10 md:hidden" />
      <PerspectiveCard article={comparison} />
    </section>
  );
}
