-- Migration: 003_rebuzz
-- Adds rebuzz (repost) support to mini_posts

ALTER TABLE mini_posts ADD COLUMN IF NOT EXISTS rebuzz_of UUID REFERENCES mini_posts(id) ON DELETE SET NULL;
ALTER TABLE mini_posts ADD COLUMN IF NOT EXISTS rebuzz_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mini_posts_rebuzz ON mini_posts(rebuzz_of);
