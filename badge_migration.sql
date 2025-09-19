-- Create the badges table
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT
);

-- Create the user_badges table
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Add RLS policies for badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public badges are viewable by everyone." ON badges FOR SELECT USING (true);
-- Add admin policies if needed, for now, we'll insert manually or through trusted functions

-- Add RLS policies for user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own badges." ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges." ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert the scavenger master badge
INSERT INTO badges (id, name, description, icon_url)
VALUES ('scavenger-master', 'Scavenger Master', 'Awarded for completing a scavenger hunt.', 'https://example.com/scavenger-master-badge.png');
