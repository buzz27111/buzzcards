-- Migration: 002_user_profiles_mini_posts
-- Adds user profiles with interests and mini promotional posts

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);

-- Mini posts (Twitter-like promotional posts)
CREATE TABLE IF NOT EXISTS mini_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  tags TEXT[] NOT NULL CHECK (array_length(tags, 1) >= 5),
  category TEXT NOT NULL CHECK (category IN (
    'technology', 'world', 'finance', 'science',
    'sports', 'entertainment', 'health', 'startup'
  )),
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mini_posts_tags ON mini_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_mini_posts_category ON mini_posts(category);
CREATE INDEX IF NOT EXISTS idx_mini_posts_user ON mini_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_mini_posts_created ON mini_posts(created_at DESC);

-- Mini post votes tracking
CREATE TABLE IF NOT EXISTS mini_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_post_id UUID NOT NULL REFERENCES mini_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mini_post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_post_votes_post ON mini_post_votes(mini_post_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Mini posts are viewable by everyone" ON mini_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create mini posts" ON mini_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mini posts" ON mini_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Votes are viewable by everyone" ON mini_post_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON mini_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change own vote" ON mini_post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON mini_post_votes FOR DELETE USING (auth.uid() = user_id);
