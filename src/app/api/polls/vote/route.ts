import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/polls/vote
 * Body: { pollId: string, optionIndex: number, fingerprint: string }
 * Records vote, prevents duplicate per fingerprint, returns percentage breakdown.
 */
export async function POST(request: Request) {
  let body: { pollId?: string; optionIndex?: number; fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pollId, optionIndex, fingerprint } = body;

  if (!pollId || optionIndex === undefined || optionIndex === null || !fingerprint) {
    return NextResponse.json(
      { error: 'Missing required fields: pollId, optionIndex, fingerprint' },
      { status: 400 }
    );
  }

  if (typeof optionIndex !== 'number' || optionIndex < 0 || !Number.isInteger(optionIndex)) {
    return NextResponse.json({ error: 'optionIndex must be a non-negative integer' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // Fetch the poll
  const { data: poll, error: fetchError } = await supabase
    .from('polls')
    .select('id, question, options, votes, voted_fingerprints')
    .eq('id', pollId)
    .single();

  if (fetchError || !poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  // Validate optionIndex is within range
  const options: string[] = poll.options ?? [];
  if (optionIndex >= options.length) {
    return NextResponse.json({ error: 'optionIndex out of range' }, { status: 400 });
  }

  // Check for duplicate vote
  const votedFingerprints: string[] = poll.voted_fingerprints ?? [];
  if (votedFingerprints.includes(fingerprint)) {
    return NextResponse.json({ error: 'Already voted on this poll' }, { status: 409 });
  }

  // Increment vote count for the selected option
  const votes: Record<string, number> = poll.votes ?? {};
  const key = String(optionIndex);
  votes[key] = (votes[key] ?? 0) + 1;

  // Add fingerprint to voted list
  votedFingerprints.push(fingerprint);

  // Update the poll
  const { error: updateError } = await supabase
    .from('polls')
    .update({ votes, voted_fingerprints: votedFingerprints })
    .eq('id', pollId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Calculate percentage breakdown
  const totalVotes = Object.values(votes).reduce((sum: number, v: number) => sum + v, 0);
  const results = options.map((_, idx) => {
    const count = votes[String(idx)] ?? 0;
    return {
      optionIndex: idx,
      votes: count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    };
  });

  return NextResponse.json({ results, totalVotes });
}
