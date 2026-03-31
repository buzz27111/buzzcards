-- BuzzCards initial database schema
-- Migration: 001_initial_schema

-- Articles table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  source_url TEXT NOT NULL UNIQUE,
  pub_date TIMESTAMPTZ NOT NULL,
  author TEXT,
  image_url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'technology', 'world', 'finance', 'science',
    'sports', 'entertainment', 'health', 'startup'
  )),
  source_name TEXT NOT NULL,
  geo_location JSONB,
  reaction_fire INT DEFAULT 0,
  reaction_heart INT DEFAULT 0,
  reaction_mindblown INT DEFAULT 0,
  reaction_sad INT DEFAULT 0,
  reaction_angry INT DEFAULT 0,
  share_count INT DEFAULT 0,
  fetch_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_pub_date ON articles(pub_date DESC);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_source_name ON articles(source_name);
CREATE INDEX idx_articles_created_at ON articles(created_at);

-- Polls table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  votes JSONB DEFAULT '{}',
  voted_fingerprints JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date DATE NOT NULL UNIQUE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz scores table
CREATE TABLE quiz_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  score INT NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, fingerprint)
);

-- Hot takes table
CREATE TABLE hot_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) <= 140),
  upvotes INT DEFAULT 0,
  upvoted_fingerprints JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hot_takes_article ON hot_takes(article_id, upvotes DESC);

-- Newsletter subscribers table
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions tracking table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('fire', 'heart', 'mindblown', 'sad', 'angry')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, fingerprint, emoji)
);

CREATE INDEX idx_reactions_article ON reactions(article_id);
