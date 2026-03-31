import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import QuizPage from '@/components/quiz/QuizPage';

export const metadata = {
  title: 'Daily Quiz — BuzzCards',
  description: 'Test your knowledge with today\'s 5-question news quiz.',
};

export default function QuizRoute() {
  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="pt-14 pb-16 md:pb-0">
        <QuizPage />
      </main>
      <BottomNav />
    </div>
  );
}
