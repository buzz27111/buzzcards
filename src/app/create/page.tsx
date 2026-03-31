'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import type { Category } from '@/lib/types';

const ALL_CATEGORIES: Category[] = ['technology','world','finance','science','sports','entertainment','health','startup'];
const CATEGORY_LABELS: Record<Category, string> = {
  technology: '💻 Technology', world: '🌍 World', finance: '💰 Finance', science: '🔬 Science',
  sports: '⚽ Sports', entertainment: '🎬 Entertainment', health: '🏥 Health', startup: '🚀 Startup',
};

export default function CreatePostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<Category | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push('/'); return; }
    if (!user) return;
    const client = getAuthClient();
    client.from('profiles').select('interests').eq('id', user.id).single()
      .then(({ data }) => {
        if (!data?.interests?.length || data.interests.length < 3) {
          setHasProfile(false);
        }
      });
  }, [user, loading, router]);

  const addTag = () => {
    let t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async () => {
    if (!user) return;
    if (content.trim().length === 0) { setError('Write something!'); return; }
    if (tags.length < 5) { setError('Add at least 5 tags'); return; }
    if (!category) { setError('Select a category'); return; }
    setError('');
    setSubmitting(true);

    const client = getAuthClient();
    const { error: insertErr } = await client.from('mini_posts').insert({
      user_id: user.id,
      content: content.trim(),
      tags,
      category,
    });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }
    router.push('/');
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" /></div>;

  if (!hasProfile) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="mx-auto max-w-lg px-4 pt-20 pb-20 text-center">
          <p className="mb-4 text-foreground/70">You need to set up your profile with at least 3 interests before writing articles.</p>
          <button onClick={() => router.push('/profile')} className="rounded-lg bg-purple-500 px-5 py-2 text-sm font-semibold text-white">Set Up Profile</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 pt-20 pb-20">
        <h1 className="mb-6 text-xl font-bold text-foreground">Write Article</h1>

        <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={500} rows={5} placeholder="Share your take, news tip, or insight..." className="mb-1 w-full rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20" />
        <p className="mb-4 text-right text-xs text-foreground/40">{content.length}/500</p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground/70">Tags <span className="text-red-400">*</span> <span className="text-xs text-foreground/40">(min 5)</span></label>
          <div className="flex gap-2">
            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="#tag" className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none" />
            <button onClick={addTag} className="rounded-lg bg-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/20">Add</button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-300">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 text-blue-400 hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-foreground/70">Category <span className="text-red-400">*</span></label>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === cat ? 'bg-purple-500 text-white' : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/15'}`}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full rounded-lg bg-purple-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
