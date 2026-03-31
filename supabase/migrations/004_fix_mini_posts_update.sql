-- Migration: 004_fix_mini_posts_update
-- Allow authenticated users to update upvote/downvote counts on mini_posts

CREATE POLICY "Authenticated users can update vote counts" ON mini_posts
  FOR UPDATE USING (true) WITH CHECK (true);
