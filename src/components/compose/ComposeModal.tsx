'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@/lib/auth';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { Category } from '@/lib/types';

const CATS: Category[] = ['technology','world','finance','science','sports','entertainment','health','startup'];
const CAT_LABEL: Record<Category,string> = {
  technology:'💻 Tech', world:'🌍 World', finance:'💰 Finance', science:'🔬 Science',
  sports:'⚽ Sports', entertainment:'🎬 Entertainment', health:'🏥 Health', startup:'🚀 Startup',
};

// Trending tags with seeded base counts
const TRENDING_TAGS = [
  { tag: 'ai', base: 234500 }, { tag: 'breaking', base: 189200 }, { tag: 'tech', base: 156800 },
  { tag: 'crypto', base: 142300 }, { tag: 'startup', base: 98700 }, { tag: 'climate', base: 87400 },
  { tag: 'politics', base: 76500 }, { tag: 'space', base: 65200 }, { tag: 'health', base: 54800 },
  { tag: 'gaming', base: 48900 }, { tag: 'finance', base: 43200 }, { tag: 'science', base: 39100 },
  { tag: 'web3', base: 35600 }, { tag: 'design', base: 31200 }, { tag: 'sports', base: 28700 },
  { tag: 'music', base: 25400 }, { tag: 'movies', base: 22100 }, { tag: 'education', base: 19800 },
  { tag: 'cybersecurity', base: 17500 }, { tag: 'robotics', base: 15200 },
];

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1).replace(/\.0$/,'')}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1).replace(/\.0$/,'')}k`;
  return String(n);
}

interface ComposeModalProps {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}

export default function ComposeModal({ open, onClose, onPosted }: ComposeModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<Category | ''>('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/,'');
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput('');
  };

  const reset = () => { setContent(''); setTags([]); setCategory(''); setTagInput(''); setError(''); };

  // Organic tick for trending tag counts
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => setTick(t => t + 1), 3000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, [open]);

  // Filter suggestions: exclude already-selected tags, match input
  const suggestions = TRENDING_TAGS
    .filter(t => !tags.includes(t.tag))
    .filter(t => !tagInput || t.tag.includes(tagInput.toLowerCase().replace(/^#/,'')))
    .slice(0, 8);

  const handlePost = async () => {
    if (!user) return;
    if (!content.trim()) { setError('Write something!'); return; }
    if (tags.length < 5) { setError(`Add ${5 - tags.length} more tag${5 - tags.length > 1 ? 's' : ''}`); return; }
    if (!category) { setError('Pick a category'); return; }
    setError(''); setPosting(true);
    const { error: err } = await getAuthClient().from('mini_posts').insert({
      user_id: user.id, content: content.trim(), tags, category,
    });
    if (err) { setError(err.message); setPosting(false); return; }
    reset(); setPosting(false); onPosted?.(); onClose();
  };

  const remaining = 500 - content.length;
  const pct = (content.length / 500) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-16 backdrop-blur-sm md:pt-24"
          onClick={onClose}>
          <motion.div initial={{y:-20,opacity:0,scale:0.95}} animate={{y:0,opacity:1,scale:1}} exit={{y:-20,opacity:0,scale:0.95}}
            transition={{type:'spring',stiffness:400,damping:30}}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-foreground/10 bg-background shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
              <button onClick={onClose} className="rounded-full p-1 text-foreground/60 hover:bg-foreground/10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <button onClick={handlePost} disabled={posting || !content.trim()}
                className="rounded-full bg-purple-500 px-5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>

            {/* Compose area */}
            <div className="flex gap-3 px-4 pt-4">
              {avatar ? <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full" />
              : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">{(name||'?')[0].toUpperCase()}</div>}
              <div className="flex-1">
                <textarea value={content} onChange={e => { setContent(e.target.value); setError(''); }}
                  maxLength={500} rows={4} placeholder="What's on your mind? Share a take, news, or insight..."
                  className="w-full resize-none bg-transparent text-lg text-foreground placeholder:text-foreground/30 focus:outline-none"
                  autoFocus />
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-2 pl-[4.25rem]">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                    #{t}<button onClick={() => setTags(p => p.filter(x => x !== t))} className="text-blue-400 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="border-t border-foreground/10 mt-3 px-4 py-3">
              {/* Tag input */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-foreground/40">Tags ({tags.length}/5+):</span>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="#add-tag" maxLength={30}
                  className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none" />
                <button onClick={addTag} className="rounded-lg bg-foreground/10 px-2.5 py-1 text-xs text-foreground hover:bg-foreground/15">+</button>
              </div>

              {/* Trending tag suggestions */}
              <div className="mb-3 max-h-32 overflow-y-auto rounded-lg border border-foreground/5 bg-foreground/[0.02]">
                <p className="sticky top-0 bg-background/90 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40 backdrop-blur-sm">🔥 Trending tags</p>
                <div className="flex flex-wrap gap-1 px-2.5 pb-2">
                  {suggestions.map(({ tag, base }) => {
                    const count = base + tick * (1 + (base % 7));
                    return (
                      <button key={tag} onClick={() => { if (!tags.includes(tag) && tags.length < 10) setTags(p => [...p, tag]); }}
                        className="group flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] transition-colors hover:bg-blue-500/15 hover:text-blue-300">
                        <span className="text-blue-400">#{tag}</span>
                        <span className="text-[10px] text-foreground/30 group-hover:text-blue-400/60">{fmtCount(count)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CATS.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${category === c ? 'text-white shadow-sm' : 'bg-foreground/10 text-foreground/50 hover:bg-foreground/15'}`}
                    style={category === c ? { backgroundColor: CATEGORY_COLORS[c].light } : undefined}>
                    {CAT_LABEL[c]}
                  </button>
                ))}
              </div>

              {/* Footer: char count + error */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Circular progress */}
                  <svg className="h-5 w-5" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/10" />
                    <circle cx="10" cy="10" r="8" fill="none" stroke={remaining < 20 ? (remaining < 0 ? '#ef4444' : '#f59e0b') : '#a855f7'}
                      strokeWidth="2" strokeDasharray={`${Math.min(pct, 100) * 0.5} 50`}
                      strokeLinecap="round" transform="rotate(-90 10 10)" />
                  </svg>
                  <span className={`text-xs ${remaining < 20 ? 'text-red-400' : 'text-foreground/40'}`}>{remaining}</span>
                </div>
                {error && <span className="text-xs text-red-400">{error}</span>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
