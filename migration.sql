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

-- Create trip_plans table
CREATE TABLE trip_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT,
  duration TEXT,
  total_distance TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS for trip_plans
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own trip plans." ON trip_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trip plans." ON trip_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trip plans." ON trip_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trip plans." ON trip_plans FOR DELETE USING (auth.uid() = user_id);

-- Create trip_locations table
CREATE TABLE trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_plan_id UUID REFERENCES trip_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  estimated_time TEXT,
  type TEXT,
  order_index INT
);

-- Set up RLS for trip_locations
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view locations for their own trips." ON trip_locations FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM trip_plans WHERE id = trip_plan_id)
);
CREATE POLICY "Users can insert locations for their own trips." ON trip_locations FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM trip_plans WHERE id = trip_plan_id)
);
CREATE POLICY "Users can update locations for their own trips." ON trip_locations FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM trip_plans WHERE id = trip_plan_id)
);
CREATE POLICY "Users can delete locations for their own trips." ON trip_locations FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM trip_plans WHERE id = trip_plan_id)
);
