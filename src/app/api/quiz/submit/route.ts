import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { QuizQuestion, LeaderboardEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quiz/submit
 * Body: { quizId: string, answers: number[], fingerprint: string }
 * Scores the answers, stores the result, and returns score + leaderboard.
 */
export async function POST(request: Request) {
  let body: { quizId?: string; answers?: number[]; fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { quizId, answers, fingerprint } = body;

  if (!quizId || !answers || !fingerprint) {
    return NextResponse.json(
      { error: 'Missing required fields: quizId, answers, fingerprint' },
      { status: 400 }
    );
  }

  if (!Array.isArray(answers)) {
    return NextResponse.json(
      { error: 'answers must be an array of numbers' },
      { status: 400 }
    );
  }

  const supabase = getServerSupabase();

  // Fetch the quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, questions')
    .eq('id', quizId)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const questions: QuizQuestion[] = quiz.questions;

  if (answers.length !== questions.length) {
    return NextResponse.json(
      { error: `Expected ${questions.length} answers, got ${answers.length}` },
      { status: 400 }
    );
  }

  // Score the answers
  const correct: boolean[] = questions.map(
    (q, i) => answers[i] === q.correctIndex
  );
  const score = correct.filter(Boolean).length;

  // Store the score (UNIQUE constraint on quiz_id + fingerprint handles duplicates)
  const { error: insertError } = await supabase
    .from('quiz_scores')
    .insert({
      quiz_id: quizId,
      fingerprint,
      score,
      answers,
    });

  if (insertError) {
    // Check for unique constraint violation (duplicate submission)
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Already submitted answers for this quiz' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Fetch leaderboard (top 10 scores for this quiz)
  const { data: leaderboardRows, error: leaderboardError } = await supabase
    .from('quiz_scores')
    .select('fingerprint, score, created_at')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (leaderboardError) {
    return NextResponse.json({ error: leaderboardError.message }, { status: 500 });
  }

  const leaderboard: LeaderboardEntry[] = (leaderboardRows ?? []).map((row) => ({
    fingerprint: row.fingerprint,
    score: row.score,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ score, correct, leaderboard });
}
