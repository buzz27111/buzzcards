'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_KEY = 'buzzcards_interstitial_shown';
const BROWSE_TIME_MS = 3 * 60 * 1000; // 3 minutes
const ARTICLE_THRESHOLD = 10;

interface InterstitialAdProps {
  articlesViewed: number;
}

export default function InterstitialAd({ articlesViewed }: InterstitialAdProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const alreadyShown = useCallback(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  const markShown = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Timer-based trigger: 3 minutes of browsing
  useEffect(() => {
    if (dismissed || alreadyShown()) return;

    const timer = setTimeout(() => {
      if (!alreadyShown()) {
        setVisible(true);
        markShown();
      }
    }, BROWSE_TIME_MS);

    return () => clearTimeout(timer);
  }, [dismissed, alreadyShown, markShown]);

  // Article count trigger: 10 articles viewed
  useEffect(() => {
    if (dismissed || alreadyShown()) return;

    if (articlesViewed >= ARTICLE_THRESHOLD) {
      setVisible(true);
      markShown();
    }
  }, [articlesViewed, dismissed, alreadyShown, markShown]);

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur-sm"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/60 transition-colors hover:bg-foreground/20 hover:text-foreground"
              aria-label="Close advertisement"
            >
              ✕
            </button>

            <div className="flex flex-col gap-3 p-6">
              {/* Sponsored label */}
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                Sponsored
              </span>

              {/* Placeholder ad area */}
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-foreground/5">
                <span className="text-sm text-foreground/30">Advertisement</span>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                <span className="font-medium">Ad</span>
                <span>·</span>
                <span>Continue reading below</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
