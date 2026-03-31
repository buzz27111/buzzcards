'use client';

import type { Category } from '@/lib/types';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import StreakWidget from '@/components/streak/StreakWidget';

const CATEGORIES: Category[] = [
  'technology',
  'world',
  'finance',
  'science',
  'sports',
  'entertainment',
  'health',
  'startup',
];

const CATEGORY_LABELS: Record<Category, string> = {
  technology: '💻 Technology',
  world: '🌍 World',
  finance: '💰 Finance',
  science: '🔬 Science',
  sports: '⚽ Sports',
  entertainment: '🎬 Entertainment',
  health: '🏥 Health',
  startup: '🚀 Startup',
};

interface SidebarProps {
  selectedCategory: Category | null;
  onCategorySelect: (category: Category | null) => void;
}

export default function Sidebar({ selectedCategory, onCategorySelect }: SidebarProps) {
  return (
    <>
      {/* Left sidebar — category navigation */}
      <aside className="fixed top-14 left-0 hidden h-[calc(100dvh-3.5rem)] w-56 overflow-y-auto border-r border-foreground/10 bg-background p-4 lg:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Categories
        </h2>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => onCategorySelect(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              📰 All
            </button>
          </li>
          {CATEGORIES.map((cat) => (
            <li key={cat}>
              <button
                onClick={() => onCategorySelect(cat)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-foreground/10 pt-4">
          <StreakWidget />
        </div>
      </aside>

      {/* Right sidebar — widgets */}
      <aside className="fixed top-14 right-0 hidden h-[calc(100dvh-3.5rem)] w-64 overflow-y-auto border-l border-foreground/10 bg-background p-4 lg:block">
        <NewsletterForm />
      </aside>
    </>
  );
}
