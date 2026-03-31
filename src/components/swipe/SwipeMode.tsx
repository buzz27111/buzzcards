'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import type { Article } from '@/lib/types';
import ArticleCard from '@/components/feed/ArticleCard';
import ReactionBar from '@/components/reactions/ReactionBar';
import ShareMenu from '@/components/sharing/ShareMenu';

interface SwipeModeProps {
  articles: Article[];
}

const SWIPE_THRESHOLD = 50;

const variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export default function SwipeMode({ articles }: SwipeModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const goNext = useCallback(() => {
    if (currentIndex < articles.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, articles.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y < -SWIPE_THRESHOLD) {
        goNext();
      } else if (info.offset.y > SWIPE_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  if (articles.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center text-foreground/50">
        No articles available
      </div>
    );
  }

  const article = articles[currentIndex];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={article.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex flex-col"
        >
          {/* Article card fills most of the viewport */}
          <div className="flex-1 overflow-y-auto px-4 pt-16 pb-32">
            <ArticleCard article={article} />
          </div>

          {/* Overlay: ReactionBar + ShareMenu at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-background via-background/80 to-transparent px-4 pb-6 pt-10">
            <div className="flex items-center justify-between">
              <ReactionBar articleId={article.id} initialReactions={article.reactions} />
              <ShareMenu
                articleId={article.id}
                title={article.title}
                sourceUrl={article.sourceUrl}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="absolute top-16 left-0 right-0 z-40 flex justify-center">
        <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs text-foreground/60 backdrop-blur-sm">
          {currentIndex + 1} / {articles.length}
        </span>
      </div>
    </div>
  );
}
