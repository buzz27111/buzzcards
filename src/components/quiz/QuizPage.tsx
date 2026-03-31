'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFingerprint } from '@/components/reactions/ReactionBar';
import type { LeaderboardEntry } from '@/lib/types';
import Leaderboard from '@/components/quiz/Leaderboard';
import AdCard from '@/components/feed/AdCard';

interface QuizQuestionData {
  question: string;
  options: string[];
  articleId: string;
}

interface QuizData {
  id: string;
  quizDate: string;
  questions: QuizQuestionData[];
}

interface SubmitResult {
  score: number;
  correct: boolean[];
  leaderboard: LeaderboardEntry[];
}

type Phase = 'loading' | 'quiz' | 'results' | 'error';

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch today's quiz on mount
  useEffect(() => {
    fetch('/api/quiz/today')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load quiz');
        return res.json();
      })
      .then((data: QuizData) => {
        setQuiz(data);
        setPhase('quiz');
      })
      .catch((err) => {
        setErrorMsg(err.message ?? 'Something went wrong');
        setPhase('error');
      });
  }, []);

  const submitQuiz = useCallback(
    async (allAnswers: number[]) => {
      if (!quiz) return;
      try {
        const fp = getFingerprint();
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: quiz.id,
            answers: allAnswers,
            fingerprint: fp,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Submit failed');
        }
        const data: SubmitResult = await res.json();
        setResult(data);
        setPhase('results');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
        setPhase('error');
      }
    },
    [quiz]
  );

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (!quiz) return;
      const newAnswers = [...answers, optionIndex];
      setAnswers(newAnswers);

      if (newAnswers.length >= quiz.questions.length) {
        submitQuiz(newAnswers);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [quiz, answers, submitQuiz]
  );

  /* ---------- Loading ---------- */
  if (phase === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-lg font-semibold text-foreground">😕 {errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-foreground/10 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/20"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---------- Results ---------- */
  if (phase === 'results' && result && quiz) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        {/* Score card */}
        <div className="rounded-2xl border border-foreground/10 bg-background/70 p-6 text-center backdrop-blur-sm">
          <p className="text-5xl font-bold">
            {result.score}/{quiz.questions.length}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {result.score === quiz.questions.length
              ? 'Perfect score! 🎉'
              : result.score >= 3
                ? 'Nice work! 👏'
                : 'Better luck tomorrow! 💪'}
          </p>

          {/* Per-question breakdown */}
          <ul className="mt-4 space-y-1 text-left text-sm">
            {quiz.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>{result.correct[i] ? '✅' : '❌'}</span>
                <span className="text-foreground/70 line-clamp-1">{q.question}</span>
              </li>
            ))}
          </ul>

          {/* Share button (generates shareable text) */}
          <button
            onClick={() => {
              const text = `I scored ${result.score}/${quiz.questions.length} on today's BuzzCards quiz! ⚡`;
              if (navigator.share) {
                navigator.share({ text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).catch(() => {});
              }
            }}
            className="mt-4 rounded-full bg-foreground/10 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/20"
          >
            Share Score 🔗
          </button>
        </div>

        {/* Ad unit on results screen (Req 8.7) */}
        <AdCard />

        {/* Leaderboard */}
        <Leaderboard leaderboard={result.leaderboard} />
      </div>
    );
  }

  /* ---------- Quiz questions ---------- */
  if (phase === 'quiz' && quiz) {
    const question = quiz.questions[currentIndex];
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Progress */}
        <div className="mb-4 flex items-center justify-between text-xs text-foreground/50">
          <span>
            Question {currentIndex + 1} of {quiz.questions.length}
          </span>
          <span>{quiz.quizDate}</span>
        </div>

        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-foreground/40 transition-all"
            style={{
              width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <h2 className="mt-6 text-lg font-semibold leading-snug text-foreground">
          {question.question}
        </h2>

        {/* Options */}
        <div className="mt-5 space-y-3">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="w-full rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
