import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import type { QuizQuestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Generates 5 quiz questions from the given articles.
 * Each question uses the article title as the question text,
 * with 4 options (one correct answer derived from the article's source name,
 * plus 3 distractors from other articles).
 */
function generateQuestions(
  articles: { id: string; title: string; source_name: string }[]
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const selected = articles.slice(0, 5);

  for (const article of selected) {
    const correctAnswer = article.source_name;

    // Gather distractor source names from other articles
    const distractors = articles
      .filter((a) => a.id !== article.id && a.source_name !== correctAnswer)
      .map((a) => a.source_name);

    // Deduplicate distractors
    const uniqueDistractors = [...new Set(distractors)];

    // Pick up to 3 distractors
    const picked: string[] = [];
    for (let i = 0; i < Math.min(3, uniqueDistractors.length); i++) {
      picked.push(uniqueDistractors[i]);
    }

    // Pad with generic options if not enough distractors
    const fallbacks = ['Associated Press', 'The Guardian', 'NPR', 'Fox News'];
    for (const fb of fallbacks) {
      if (picked.length >= 3) break;
      if (fb !== correctAnswer && !picked.includes(fb)) {
        picked.push(fb);
      }
    }

    // Build options array with correct answer at a random position
    const options = [...picked.slice(0, 3)];
    const correctIndex = Math.floor(Math.random() * 4);
    options.splice(correctIndex, 0, correctAnswer);

    questions.push({
      question: `Which source published: "${article.title}"?`,
      options,
      correctIndex,
      articleId: article.id,
    });
  }

  return questions;
}

/**
 * GET /api/quiz/today
 * Returns today's quiz (5 questions from top 10 articles).
 * If no quiz exists for today, generates one and stores it.
 * Returns questions WITHOUT correctIndex to avoid revealing answers.
 */
export async function GET() {
  const supabase = getServerSupabase();

  // Get today's date in UTC (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  // Try to fetch existing quiz for today
  const { data: existingQuiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, quiz_date, questions')
    .eq('quiz_date', today)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected if quiz doesn't exist yet
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existingQuiz) {
    // Strip correctIndex from questions before returning
    const safeQuestions = (existingQuiz.questions as QuizQuestion[]).map(
      ({ correctIndex: _ci, ...rest }) => rest
    );

    return NextResponse.json({
      id: existingQuiz.id,
      quizDate: existingQuiz.quiz_date,
      questions: safeQuestions,
    });
  }

  // No quiz for today — generate one from top 10 articles
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, source_name')
    .order('pub_date', { ascending: false })
    .limit(10);

  if (articlesError) {
    return NextResponse.json({ error: articlesError.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json(
      { error: 'No articles available to generate quiz' },
      { status: 404 }
    );
  }

  const questions = generateQuestions(articles);

  if (questions.length === 0) {
    return NextResponse.json(
      { error: 'Could not generate quiz questions' },
      { status: 500 }
    );
  }

  // Store the new quiz
  const { data: newQuiz, error: insertError } = await supabase
    .from('quizzes')
    .insert({ quiz_date: today, questions })
    .select('id, quiz_date, questions')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Strip correctIndex before returning
  const safeQuestions = (newQuiz.questions as QuizQuestion[]).map(
    ({ correctIndex: _ci, ...rest }) => rest
  );

  return NextResponse.json({
    id: newQuiz.id,
    quizDate: newQuiz.quiz_date,
    questions: safeQuestions,
  });
}
