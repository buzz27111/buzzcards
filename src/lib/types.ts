export type Category =
  | 'technology'
  | 'world'
  | 'finance'
  | 'science'
  | 'sports'
  | 'entertainment'
  | 'health'
  | 'startup';

export type EmojiType = 'fire' | 'heart' | 'mindblown' | 'sad' | 'angry';

export interface ReactionCounts {
  fire: number;
  heart: number;
  mindblown: number;
  sad: number;
  angry: number;
}

export interface Article {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  sourceUrl: string;
  pubDate: string; // ISO 8601
  author: string | null;
  imageUrl: string | null;
  category: Category;
  sourceName: string;
  geoLocation: { lat: number; lng: number; label: string } | null;
  reactions: ReactionCounts;
  shareCount: number;
  fetchTimestamp: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  totalVotes: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  articleId: string;
}

export interface Quiz {
  id: string;
  quizDate: string;
  questions: QuizQuestion[];
}

export interface HotTake {
  id: string;
  articleId: string;
  text: string;
  upvotes: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  fingerprint: string;
  score: number;
  createdAt: string;
}

export interface FeedSource {
  name: string;
  url: string;
  category: Category;
}

export type StreakBadge = '3-day' | '7-day' | '14-day' | '30-day' | '100-day';

export interface LocalStreakData {
  fingerprint: string;
  lastVisit: string; // ISO date string YYYY-MM-DD
  streakCount: number;
  badges: StreakBadge[];
}

// User profile
export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  interests: string[];
  bio: string | null;
}

// Mini post (Twitter-like promotional post)
export interface MiniPost {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  category: Category;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  // Joined fields
  authorName?: string;
  authorAvatar?: string;
  userVote?: 'up' | 'down' | null;
  // Rebuzz
  rebuzzOf?: string | null;
  rebuzzCount?: number;
  originalPost?: MiniPost | null;
}
