'use client';

import type { Category } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/constants';

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
  technology: 'Technology',
  world: 'World',
  finance: 'Finance',
  science: 'Science',
  sports: 'Sports',
  entertainment: 'Entertainment',
  health: 'Health',
  startup: 'Startup',
};

interface CategoryChipsProps {
  selectedCategory: Category | null;
  onCategorySelect: (category: Category | null) => void;
}

export default function CategoryChips({ selectedCategory, onCategorySelect }: CategoryChipsProps) {
  return (
    <div className="block lg:hidden">
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2" role="tablist">
        <button
          role="tab"
          aria-selected={selectedCategory === null}
          onClick={() => onCategorySelect(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-foreground text-background'
              : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/15'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const colors = CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onCategorySelect(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? ''
                  : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/15'
              }`}
              style={
                isSelected
                  ? { backgroundColor: colors.light, color: '#fff' }
                  : undefined
              }
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
