import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/hot-takes/upvote
 * Body: { hotTakeId: string, fingerprint: string }
 * Toggles upvote: adds if not present, removes if already upvoted.
 * Returns: { upvotes: number }
 */
export async function POST(request: Request) {
  let body: { hotTakeId?: string; fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { hotTakeId, fingerprint } = body;

  if (!hotTakeId || !fingerprint) {
    return NextResponse.json(
      { error: 'Missing required fields: hotTakeId, fingerprint' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Fetch the hot take
  const { data: hotTake, error: fetchError } = await supabase
    .from('hot_takes')
    .select('id, upvotes, upvoted_fingerprints')
    .eq('id', hotTakeId)
    .single();

  if (fetchError || !hotTake) {
    return NextResponse.json({ error: 'Hot take not found' }, { status: 404 });
  }

  const upvotedFingerprints: string[] = hotTake.upvoted_fingerprints ?? [];
  let newUpvotes: number = hotTake.upvotes ?? 0;

  if (upvotedFingerprints.includes(fingerprint)) {
    // Already upvoted — remove fingerprint and decrement
    const updated = upvotedFingerprints.filter((fp: string) => fp !== fingerprint);
    newUpvotes = Math.max(0, newUpvotes - 1);

    const { error: updateError } = await supabase
      .from('hot_takes')
      .update({ upvotes: newUpvotes, upvoted_fingerprints: updated })
      .eq('id', hotTakeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    // Not yet upvoted — add fingerprint and increment
    upvotedFingerprints.push(fingerprint);
    newUpvotes += 1;

    const { error: updateError } = await supabase
      .from('hot_takes')
      .update({ upvotes: newUpvotes, upvoted_fingerprints: upvotedFingerprints })
      .eq('id', hotTakeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ upvotes: newUpvotes });
}
