import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { EmojiType, ReactionCounts } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_EMOJIS: EmojiType[] = ['fire', 'heart', 'mindblown', 'sad', 'angry'];

const emojiToColumn: Record<EmojiType, string> = {
  fire: 'reaction_fire',
  heart: 'reaction_heart',
  mindblown: 'reaction_mindblown',
  sad: 'reaction_sad',
  angry: 'reaction_angry',
};

function isValidEmoji(emoji: string): emoji is EmojiType {
  return VALID_EMOJIS.includes(emoji as EmojiType);
}

/**
 * POST /api/reactions
 * Body: { articleId: string, emoji: EmojiType, fingerprint: string }
 * Toggles reaction: adds if not present, removes if already reacted.
 * Returns: { reactions: ReactionCounts }
 */
export async function POST(request: Request) {
  let body: { articleId?: string; emoji?: string; fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { articleId, emoji, fingerprint } = body;

  if (!articleId || !emoji || !fingerprint) {
    return NextResponse.json(
      { error: 'Missing required fields: articleId, emoji, fingerprint' },
      { status: 400 }
    );
  }

  if (!isValidEmoji(emoji)) {
    return NextResponse.json(
      { error: `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();
  const column = emojiToColumn[emoji];

  // Check if reaction already exists
  const { data: existing, error: lookupError } = await supabase
    .from('reactions')
    .select('id')
    .eq('article_id', articleId)
    .eq('fingerprint', fingerprint)
    .eq('emoji', emoji)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if (existing) {
    // Remove reaction: delete from reactions table and decrement count
    const { error: deleteError } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Decrement the reaction count column (floor at 0)
    const { error: decrementError } = await supabase.rpc('decrement_reaction', {
      p_article_id: articleId,
      p_column: column,
    });

    // Fallback: if RPC doesn't exist, use raw update
    if (decrementError) {
      const { data: article } = await supabase
        .from('articles')
        .select(column)
        .eq('id', articleId)
        .single();

      const row = article as unknown as Record<string, number> | null;
      const currentCount = row ? (row[column] ?? 0) : 0;
      const { error: updateError } = await supabase
        .from('articles')
        .update({ [column]: Math.max(0, currentCount - 1) })
        .eq('id', articleId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  } else {
    // Add reaction: insert into reactions table and increment count
    const { error: insertError } = await supabase
      .from('reactions')
      .insert({ article_id: articleId, fingerprint, emoji });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Increment the reaction count column
    const { error: incrementError } = await supabase.rpc('increment_reaction', {
      p_article_id: articleId,
      p_column: column,
    });

    // Fallback: if RPC doesn't exist, use raw update
    if (incrementError) {
      const { data: article } = await supabase
        .from('articles')
        .select(column)
        .eq('id', articleId)
        .single();

      const row = article as unknown as Record<string, number> | null;
      const currentCount = row ? (row[column] ?? 0) : 0;
      const { error: updateError } = await supabase
        .from('articles')
        .update({ [column]: currentCount + 1 })
        .eq('id', articleId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
  }

  // Fetch updated reaction counts
  const { data: updatedArticle, error: fetchError } = await supabase
    .from('articles')
    .select('reaction_fire, reaction_heart, reaction_mindblown, reaction_sad, reaction_angry')
    .eq('id', articleId)
    .single();

  if (fetchError || !updatedArticle) {
    return NextResponse.json({ error: 'Failed to fetch updated counts' }, { status: 500 });
  }

  const reactions: ReactionCounts = {
    fire: updatedArticle.reaction_fire ?? 0,
    heart: updatedArticle.reaction_heart ?? 0,
    mindblown: updatedArticle.reaction_mindblown ?? 0,
    sad: updatedArticle.reaction_sad ?? 0,
    angry: updatedArticle.reaction_angry ?? 0,
  };

  return NextResponse.json({ reactions });
}

/**
 * GET /api/reactions?articleId=string&fingerprint=string
 * Returns reaction counts and user's current reactions for an article.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');
  const fingerprint = searchParams.get('fingerprint');

  if (!articleId) {
    return NextResponse.json({ error: 'Missing required param: articleId' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Fetch reaction counts from articles table
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('reaction_fire, reaction_heart, reaction_mindblown, reaction_sad, reaction_angry')
    .eq('id', articleId)
    .single();

  if (articleError || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const reactions: ReactionCounts = {
    fire: article.reaction_fire ?? 0,
    heart: article.reaction_heart ?? 0,
    mindblown: article.reaction_mindblown ?? 0,
    sad: article.reaction_sad ?? 0,
    angry: article.reaction_angry ?? 0,
  };

  // Fetch user's current reactions if fingerprint provided
  let userReactions: EmojiType[] = [];

  if (fingerprint) {
    const { data: userReactionRows, error: reactionError } = await supabase
      .from('reactions')
      .select('emoji')
      .eq('article_id', articleId)
      .eq('fingerprint', fingerprint);

    if (!reactionError && userReactionRows) {
      userReactions = userReactionRows.map((r) => r.emoji as EmojiType);
    }
  }

  return NextResponse.json({ reactions, userReactions });
}
