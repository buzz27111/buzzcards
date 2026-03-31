'use client';

import { useState } from 'react';
import MiniPostCard from '@/components/feed/MiniPostCard';
import CopyLinkButton from '@/components/common/CopyLinkButton';
import type { MiniPost } from '@/lib/types';

interface Props {
  post: MiniPost;
  url: string;
}

export default function BuzzPageClient({ post, url }: Props) {
  const [shared, setShared] = useState(false);

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content.slice(0,100)+'...')}&url=${encodeURIComponent(url)}`, '_blank');
  };
  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };
  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(post.content.slice(0,100)+' '+url)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Interactive post card with voting */}
      <MiniPostCard post={post} />

      {/* Share bar */}
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Share this article</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={shareToTwitter}
            className="rounded-full bg-foreground/10 px-3 py-1.5 text-xs text-foreground/70 hover:bg-foreground/15">
            𝕏 Twitter
          </button>
          <button onClick={shareToLinkedIn}
            className="rounded-full bg-foreground/10 px-3 py-1.5 text-xs text-foreground/70 hover:bg-foreground/15">
            💼 LinkedIn
          </button>
          <button onClick={shareToWhatsApp}
            className="rounded-full bg-foreground/10 px-3 py-1.5 text-xs text-foreground/70 hover:bg-foreground/15">
            💬 WhatsApp
          </button>
          <CopyLinkButton url={url} />
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={() => { navigator.share({ title: 'BuzzCards Article', text: post.content.slice(0,100), url }); }}
              className="rounded-full bg-purple-500/20 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/30">
              📤 Share
            </button>
          )}
        </div>
      </div>

      {/* Engagement stats */}
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Engagement</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{post.upvotes}</p>
            <p className="text-[10px] text-foreground/50">Upvotes</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{post.rebuzzCount || 0}</p>
            <p className="text-[10px] text-foreground/50">Rebuzzes</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{post.tags.length}</p>
            <p className="text-[10px] text-foreground/50">Tags</p>
          </div>
        </div>
      </div>
    </div>
  );
}
