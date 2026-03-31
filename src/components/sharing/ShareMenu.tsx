'use client';

import { useState, useRef, useEffect } from 'react';

interface ShareMenuProps {
  articleId: string;
  title: string;
  sourceUrl: string;
}

export default function ShareMenu({ articleId, title, sourceUrl }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /** Fire-and-forget share count increment */
  function incrementShareCount() {
    fetch('/api/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId }),
    }).catch(() => {});
  }

  async function handleShare() {
    // Use Web Share API if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: sourceUrl });
        incrementShareCount();
      } catch {
        // User cancelled or share failed — no-op
      }
      return;
    }
    // Otherwise toggle custom menu
    setOpen((prev) => !prev);
  }

  function shareToTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(sourceUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    incrementShareCount();
    setOpen(false);
  }

  function shareToFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sourceUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    incrementShareCount();
    setOpen(false);
  }

  function shareToLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sourceUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    incrementShareCount();
    setOpen(false);
  }

  function shareToWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(title + ' ' + sourceUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    incrementShareCount();
    setOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(sourceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
    incrementShareCount();
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
        aria-label="Share article"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {copied ? 'Copied!' : 'Share'}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-xl border border-foreground/10 bg-background/95 p-1.5 shadow-lg backdrop-blur-md">
          <button onClick={shareToTwitter} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            𝕏 Twitter / X
          </button>
          <button onClick={shareToFacebook} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            📘 Facebook
          </button>
          <button onClick={shareToLinkedIn} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            💼 LinkedIn
          </button>
          <button onClick={shareToWhatsApp} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            💬 WhatsApp
          </button>
          <button onClick={copyLink} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            🔗 Copy link
          </button>
        </div>
      )}
    </div>
  );
}
