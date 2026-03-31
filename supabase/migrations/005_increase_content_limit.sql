-- Migration: 005_increase_content_limit
-- Increase mini_posts content limit from 280 to 500 characters

ALTER TABLE mini_posts DROP CONSTRAINT IF EXISTS mini_posts_content_check;
ALTER TABLE mini_posts ADD CONSTRAINT mini_posts_content_check CHECK (char_length(content) <= 500);
