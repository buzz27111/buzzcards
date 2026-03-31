'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAuthClient } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import MiniPostCard from '@/components/feed/MiniPostCard';
import type { Category, MiniPost } from '@/lib/types';

const TAGS = ['AI','ML','Web3','Crypto','Climate','Space','Startups','Gaming',
  'Politics','Economics','Health','Fitness','Science','Design','Music','Movies',
  'Sports','Travel','Food','Fashion','Education','Cybersecurity','Robotics','EVs'];

const BADGES = [
  { id: 'first-post', label: '✍️ First Post', req: (p: number) => p >= 1 },
  { id: '5-posts', label: '📝 5 Articles', req: (p: number) => p >= 5 },
  { id: '10-posts', label: '🔥 10 Articles', req: (p: number) => p >= 10 },
  { id: '50-upvotes', label: '👍 50 Upvotes', req: (_: number, u: number) => u >= 50 },
  { id: '100-upvotes', label: '⭐ 100 Upvotes', req: (_: number, u: number) => u >= 100 },
  { id: 'trending', label: '📈 Trending', req: (_: number, u: number) => u >= 500 },
];

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/,'')}k` : String(n); }
function seed(s: string) { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); }

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [posts, setPosts] = useState<MiniPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [pinnedId, setPinnedIdRaw] = useState<string | null>(null);
  const setPinnedId = (id: string | null) => {
    setPinnedIdRaw(id);
    if (id) localStorage.setItem('buzzcards_pinned_post', id);
    else localStorage.removeItem('buzzcards_pinned_post');
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name:'', bio:'', interests:[] as string[], location:'', website:'' });
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!loading && !user) { router.push('/'); return; }
    if (!user) return;
    setPinnedIdRaw(localStorage.getItem('buzzcards_pinned_post'));
    const c = getAuthClient();
    c.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        const n = data.display_name || user.user_metadata?.full_name || '';
        setName(n); setBio(data.bio||''); setInterests(data.interests||[]);
        setAvatar(data.avatar_url || user.user_metadata?.avatar_url || '');
        setLocation((data as Record<string,unknown>).location as string || '');
        setWebsite((data as Record<string,unknown>).website as string || '');
        setDraft({ name:n, bio:data.bio||'', interests:[...(data.interests||[])],
          location:(data as Record<string,unknown>).location as string||'',
          website:(data as Record<string,unknown>).website as string||'' });
      }
    });
    c.from('mini_posts').select('*').eq('user_id', user.id).order('created_at',{ascending:false}).then(async ({data})=>{
      if(data) {
        // Fetch user's votes for these posts
        const postIds = data.map((p: Record<string,unknown>) => p.id as string);
        const { data: votes } = await c.from('mini_post_votes').select('mini_post_id, vote_type').eq('user_id', user.id).in('mini_post_id', postIds);
        const voteMap = new Map((votes || []).map((v: Record<string,unknown>) => [v.mini_post_id as string, v.vote_type as string]));

        setPosts(data.map((p:Record<string,unknown>)=>({
        id:p.id as string, userId:p.user_id as string, content:p.content as string,
        tags:p.tags as string[], category:p.category as Category,
        upvotes:(p.upvotes as number)??0, downvotes:(p.downvotes as number)??0,
        createdAt:p.created_at as string,
        authorName: name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
        authorAvatar: avatar || user.user_metadata?.avatar_url || null,
        userVote: (voteMap.get(p.id as string) as 'up' | 'down') ?? null,
      })));
      }
      setPostsLoading(false);
    });
  }, [user, loading, router]);

  // Time-based fake engagement — grows gradually over hours/days, not instant
  const ageBoost = (createdAt: string) => {
    const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000*60*60));
    if (ageHours < 0.5) return 0; // first 30 min: nothing
    if (ageHours < 2) return Math.floor(ageHours * 2); // 0-4 in first 2 hours
    if (ageHours < 24) return 4 + Math.floor((ageHours - 2) * 1.5); // ~37 by end of day 1
    return 37 + Math.floor((ageHours - 24) * 0.3); // slow growth after day 1
  };
  const viewBoost = (createdAt: string) => {
    const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000*60*60));
    if (ageHours < 0.5) return 0;
    if (ageHours < 2) return Math.floor(ageHours * 5);
    if (ageHours < 24) return 10 + Math.floor((ageHours - 2) * 4);
    return 98 + Math.floor((ageHours - 24) * 1);
  };

  const totalUpvotes = useMemo(() => posts.reduce((s,p) => s + p.upvotes + ageBoost(p.createdAt), 0), [posts]);
  const totalViews = useMemo(() => posts.reduce((s,p) => s + viewBoost(p.createdAt), 0), [posts]);
  const engRate = totalViews > 0 ? ((totalUpvotes / totalViews) * 100).toFixed(1) : '0';
  const earned = BADGES.filter(b => b.req(posts.length, totalUpvotes));

  const topTags = useMemo(() => {
    const map = new Map<string,number>();
    posts.forEach(p => p.tags.forEach(t => map.set(t, (map.get(t)||0)+1)));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [posts]);
  const maxTag = topTags.length > 0 ? topTags[0][1] : 1;

  const startEdit = () => { setDraft({name,bio,interests:[...interests],location,website}); setEditing(true); };
  const toggleInt = (t:string) => setDraft(d=>({...d,interests:d.interests.includes(t)?d.interests.filter(x=>x!==t):[...d.interests,t]}));
  const addCustom = () => { const t=custom.trim(); if(t&&!draft.interests.includes(t)) setDraft(d=>({...d,interests:[...d.interests,t]})); setCustom(''); };
  const saveProfile = async () => {
    if(!user||draft.interests.length<3) return;
    setSaving(true);
    await getAuthClient().from('profiles').update({
      display_name:draft.name, bio:draft.bio, interests:draft.interests
    }).eq('id',user.id);
    setName(draft.name); setBio(draft.bio); setInterests(draft.interests);
    setLocation(draft.location); setWebsite(draft.website);
    setSaving(false); setEditing(false);
  };

  if(loading) return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"/></div>;
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '';

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl pb-20">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 md:h-48" />
        {/* Avatar + actions */}
        <div className="relative px-4 lg:px-6">
          <div className="-mt-16 flex items-end justify-between md:-mt-20">
            {avatar ? <img src={avatar} alt="" className="h-28 w-28 rounded-full border-4 border-background object-cover shadow-xl md:h-32 md:w-32" />
            : <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-purple-500 text-4xl font-bold text-white shadow-xl md:h-32 md:w-32">{(name||'?')[0].toUpperCase()}</div>}
            <div className="mb-2 flex gap-2">
              <button onClick={()=>{navigator.clipboard.writeText(window.location.href)}} className="rounded-full border border-foreground/20 p-2 text-foreground/60 hover:bg-foreground/5" aria-label="Share profile">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              </button>
              {!editing ? <button onClick={startEdit} className="rounded-full border border-foreground/20 px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-foreground/5">Edit profile</button>
              : <><button onClick={()=>setEditing(false)} className="rounded-full border border-foreground/20 px-4 py-1.5 text-sm text-foreground/60 hover:bg-foreground/5">Cancel</button>
                <button onClick={saveProfile} disabled={saving||draft.interests.length<3} className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-40">{saving?'Saving...':'Save'}</button></>}
            </div>
          </div>
          {/* Name / bio */}
          <div className="mt-3">
            {editing ? <div className="space-y-2">
              <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} maxLength={50} placeholder="Display name" className="w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-lg font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"/>
              <textarea value={draft.bio} onChange={e=>setDraft(d=>({...d,bio:e.target.value}))} maxLength={160} rows={2} placeholder="Bio" className="w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm text-foreground/80 focus:outline-none focus:ring-1 focus:ring-purple-500/50"/>
              <div className="flex gap-2">
                <input value={draft.location} onChange={e=>setDraft(d=>({...d,location:e.target.value}))} maxLength={50} placeholder="📍 Location" className="flex-1 rounded-lg border border-foreground/15 bg-transparent px-3 py-1.5 text-xs text-foreground focus:outline-none"/>
                <input value={draft.website} onChange={e=>setDraft(d=>({...d,website:e.target.value}))} maxLength={100} placeholder="🔗 Website" className="flex-1 rounded-lg border border-foreground/15 bg-transparent px-3 py-1.5 text-xs text-foreground focus:outline-none"/>
              </div>
            </div> : <>
              <h1 className="text-xl font-bold text-foreground">{name}</h1>
              <p className="text-sm text-foreground/50">@{user?.email?.split('@')[0]}</p>
              {bio && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{bio}</p>}
            </>}
          </div>
          {/* Meta */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/50">
            {location && !editing && <span>📍 {location}</span>}
            {website && !editing && <a href={website.startsWith('http')?website:`https://${website}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">🔗 {website.replace(/^https?:\/\//,'')}</a>}
            {joined && <span>📅 Joined {joined}</span>}
          </div>

          {/* Interests */}
          {editing ? (
            <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <p className="mb-2 text-xs font-semibold text-foreground/60">INTERESTS <span className="text-red-400">*</span></p>
              <div className="flex flex-wrap gap-1.5">{TAGS.map(t=><button key={t} onClick={()=>toggleInt(t)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${draft.interests.includes(t)?'bg-purple-500 text-white shadow-sm shadow-purple-500/30':'bg-foreground/10 text-foreground/60 hover:bg-foreground/15'}`}>{t}</button>)}</div>
              <div className="mt-2 flex gap-2"><input value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()} placeholder="Custom..." className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1 text-xs text-foreground focus:outline-none"/><button onClick={addCustom} className="rounded-lg bg-foreground/10 px-2.5 py-1 text-xs text-foreground hover:bg-foreground/15">Add</button></div>
              {draft.interests.length<3 && <p className="mt-1 text-[11px] text-red-400">Select {3-draft.interests.length} more</p>}
            </div>
          ) : interests.length>0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">{interests.map(i=><span key={i} className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-medium text-purple-300">{i}</span>)}</div>
          ) : null}
        </div>

        {/* ── Stats + Sidebar + Posts grid ── */}
        <div className="mt-4 border-t border-foreground/10" />
        <div className="grid grid-cols-1 gap-6 px-4 pt-6 lg:grid-cols-3 lg:px-6">
          {/* Left sidebar — stats & badges */}
          <div className="space-y-4 lg:col-span-1">
            {/* Stats card */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Stats</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-lg font-bold text-foreground">{posts.length}</p><p className="text-[10px] text-foreground/50">Articles</p></div>
                <div><p className="text-lg font-bold text-foreground">{fmt(totalUpvotes)}</p><p className="text-[10px] text-foreground/50">Upvotes</p></div>
                <div><p className="text-lg font-bold text-foreground">{fmt(totalViews)}</p><p className="text-[10px] text-foreground/50">Views</p></div>
              </div>
              <div className="mt-3 rounded-lg bg-foreground/5 px-3 py-2 text-center"><span className="text-xs text-foreground/60">Engagement rate: </span><span className="text-xs font-semibold text-green-400">{engRate}%</span></div>
            </div>
            {/* Badges */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Badges</h3>
              {earned.length === 0 ? <p className="text-xs text-foreground/40">Write articles to earn badges</p>
              : <div className="flex flex-wrap gap-2">{earned.map(b=><span key={b.id} className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-300">{b.label}</span>)}</div>}
              {earned.length < BADGES.length && <div className="mt-3 space-y-1">{BADGES.filter(b=>!earned.includes(b)).slice(0,3).map(b=><p key={b.id} className="text-[10px] text-foreground/30">🔒 {b.label}</p>)}</div>}
            </div>

            {/* Top Tags chart */}
            {topTags.length > 0 && (
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Top Tags</h3>
                <div className="space-y-2">
                  {topTags.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span className="w-16 truncate text-xs text-foreground/70">#{tag}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-foreground/10 h-2">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${(count/maxTag)*100}%` }} />
                      </div>
                      <span className="text-[10px] text-foreground/50">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading streak */}
            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">Reading Streak</h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="text-lg font-bold text-foreground">{user ? 1 + (seed(user.id + 'streak') % 14) : 1} days</p>
                  <p className="text-[10px] text-foreground/50">Keep reading daily!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Posts feed */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Articles</h2>
              <button onClick={() => router.push('/create')} className="rounded-full bg-purple-500 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90">+ New Article</button>
            </div>
            {postsLoading ? (
              <div className="space-y-4">{[0,1,2].map(i=><div key={i} className="h-28 animate-pulse rounded-2xl bg-foreground/5"/>)}</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 py-16 text-center">
                <div className="mb-3 text-4xl">✍️</div>
                <p className="text-sm text-foreground/50">No articles yet</p>
                <p className="mt-1 text-xs text-foreground/40">Share your thoughts with the community</p>
                <button onClick={() => router.push('/create')} className="mt-4 rounded-full bg-purple-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90">Write your first article</button>
              </div>
            ) : (
              <div className="space-y-3">
                {pinnedId && posts.find(p=>p.id===pinnedId) && (
                  <div className="relative">
                    <span className="absolute -top-2 left-3 z-10 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">📌 Pinned</span>
                    <MiniPostCard post={posts.find(p=>p.id===pinnedId)!} onDelete={id=>{setPosts(p=>p.filter(x=>x.id!==id));setPinnedId(null);}} />
                  </div>
                )}
                {posts.filter(p=>p.id!==pinnedId).map(post=>(
                  <div key={post.id} className="group relative">
                    <MiniPostCard post={post} onDelete={id=>setPosts(p=>p.filter(x=>x.id!==id))} />
                    <button onClick={()=>setPinnedId(pinnedId===post.id?null:post.id)}
                      className="absolute top-2 right-2 hidden rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] text-foreground/50 backdrop-blur-sm group-hover:block hover:text-yellow-400">
                      {pinnedId===post.id?'Unpin':'📌 Pin'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
