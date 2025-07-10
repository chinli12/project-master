-- Create followers table
CREATE TABLE followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Set up RLS for followers
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public followers are viewable by everyone." ON followers FOR SELECT USING (true);
CREATE POLICY "Users can follow others." ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow others." ON followers FOR DELETE USING (auth.uid() = follower_id);

-- Create places_visited table
CREATE TABLE places_visited (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  image_url TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS for places_visited
ALTER TABLE places_visited ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public places_visited are viewable by everyone." ON places_visited FOR SELECT USING (true);
CREATE POLICY "Users can insert their own places_visited." ON places_visited FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own places_visited." ON places_visited FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own places_visited." ON places_visited FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_group_member_count(group_id_param UUID)
RETURNS INT AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT COUNT(*)
  INTO member_count
  FROM group_members
  WHERE group_id = group_id_param;

  RETURN member_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_group_last_activity(group_id_param UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  last_activity_time TIMESTAMPTZ;
BEGIN
  SELECT MAX(created_at)
  INTO last_activity_time
  FROM posts
  WHERE group_id = group_id_param;

  RETURN last_activity_time;
END;
$$ LANGUAGE plpgsql;
