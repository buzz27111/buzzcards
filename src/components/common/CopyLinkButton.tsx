'use client';

import { useState } from 'react';

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="rounded-full border border-foreground/15 px-3 py-1 text-xs text-foreground/60 hover:bg-foreground/5"
    >
      {copied ? '✓ Copied' : '🔗 Copy link'}
    </button>
  );
}
