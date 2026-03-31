'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Article } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/constants';
import ShareMenu from '@/components/sharing/ShareMenu';

/** Convert an ISO date string to a relative time label like "3 hours ago". */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Estimate reading time from text (~200 words/min). */
export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const colors = CATEGORY_COLORS[article.category];
  const displayText = article.summary ?? article.description ?? '';
  const categoryLabel = article.category.charAt(0).toUpperCase() + article.category.slice(1);

  return (
    <motion.article
      className="group relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-sm transition-shadow"
      whileHover={{
        scale: 1.02,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Glassmorphism hover overlay (desktop) */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
        style={{ backdropFilter: 'blur(2px)', background: 'rgba(255,255,255,0.05)' }}
      />

      {/* Article image */}
      {article.imageUrl && (
        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="relative z-20 block">
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        </a>
      )}

      <div className="relative z-20 flex flex-col gap-2 p-4">
        {/* Category badge + meta row */}
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: colors.light }}
          >
            {categoryLabel}
          </span>
          <span>{timeAgo(article.pubDate)}</span>
          <span>·</span>
          <span>{readingTime(displayText)}</span>
        </div>

        {/* Title */}
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-base font-bold leading-snug text-foreground hover:underline"
        >
          {article.title}
        </a>

        {/* Summary */}
        {displayText && (
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground/70">
            {displayText}
          </p>
        )}

        {/* Source name + compare + share */}
        <div className="mt-1 flex items-center justify-between text-xs text-foreground/50">
          <span className="font-medium">{article.sourceName}</span>
          <div className="flex items-center gap-2">
            <Link
              href={`/compare?articleId=${article.id}`}
              className="rounded-full border border-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              Compare
            </Link>
            <ShareMenu articleId={article.id} title={article.title} sourceUrl={article.sourceUrl} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
