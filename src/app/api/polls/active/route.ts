import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { Poll } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/polls/active
 * Returns active polls ordered by created_at DESC, limit 10.
 */
export async function GET() {
  const supabase = getServerSupabase();

  const { data: polls, error } = await supabase
    .from('polls')
    .select('id, question, options, votes, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped: Poll[] = (polls ?? []).map((p) => {
    const votes: Record<string, number> = p.votes ?? {};
    const totalVotes = Object.values(votes).reduce((sum: number, v: number) => sum + v, 0);
    return {
      id: p.id,
      question: p.question,
      options: p.options,
      votes,
      totalVotes,
    };
  });

  return NextResponse.json({ polls: mapped });
}
