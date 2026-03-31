'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Article } from '@/lib/types';
import ArticleCard from '@/components/feed/ArticleCard';

/** Simple confetti particle component */
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6', '#60A5FA'];
  const color = colors[index % colors.length];
  const x = Math.random() * 300 - 150;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
      style={{ backgroundColor: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x,
        y: Math.random() * 400 - 100,
        opacity: 0,
        scale: Math.random() * 0.5 + 0.5,
        rotate: rotation,
      }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    />
  );
}

/** Placeholder card shown during slot-machine spin */
function SpinPlaceholder() {
  return (
    <div className="h-48 w-full rounded-2xl bg-foreground/10 flex items-center justify-center">
      <span className="text-4xl">🎰</span>
    </div>
  );
}

export default function SurpriseMe() {
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spinCount = useRef(0);

  const handleSurprise = useCallback(async () => {
    if (spinning) return;
    setError(null);
    setSpinning(true);
    setShowModal(true);
    setArticle(null);
    setShowConfetti(false);

    try {
      const excludeParam = shownIds.length > 0 ? `?exclude=${shownIds.join(',')}` : '';
      const res = await fetch(`/api/articles/random${excludeParam}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'No articles available' }));
        throw new Error(data.error || 'Failed to fetch');
      }

      const { article: fetched } = (await res.json()) as { article: Article };

      // Slot-machine spin animation: cycle through placeholders
      spinCount.current = 0;
      const spinInterval = setInterval(() => {
        spinCount.current += 1;
        if (spinCount.current >= 6) {
          clearInterval(spinInterval);
          setShownIds((prev) => [...prev, fetched.id]);
          setArticle(fetched);
          setSpinning(false);
          setShowConfetti(true);
          // Hide confetti after animation
          setTimeout(() => setShowConfetti(false), 1500);
        }
      }, 150);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [spinning, shownIds]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setArticle(null);
    setSpinning(false);
    setShowConfetti(false);
    setError(null);
  }, []);

  return (
    <>
      {/* Fixed-position Surprise Me button */}
      <button
        onClick={handleSurprise}
        disabled={spinning}
        className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 md:bottom-6"
        aria-label="Surprise Me — show a random article"
      >
        <span className="text-lg">🎲</span>
        Surprise Me
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="relative w-full max-w-md"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/20"
                aria-label="Close"
              >
                ✕
              </button>

              {/* Confetti */}
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <ConfettiParticle key={i} index={i} />
                  ))}
                </div>
              )}

              {/* Spinning state */}
              {spinning && (
                <motion.div
                  key="spin"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                >
                  <SpinPlaceholder />
                </motion.div>
              )}

              {/* Article result */}
              {article && !spinning && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <ArticleCard article={article} />
                </motion.div>
              )}

              {/* Error state */}
              {error && !spinning && (
                <div className="rounded-2xl bg-background/90 p-6 text-center backdrop-blur-sm">
                  <p className="text-foreground/70">{error}</p>
                  <button
                    onClick={closeModal}
                    className="mt-3 text-sm text-purple-400 hover:underline"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
