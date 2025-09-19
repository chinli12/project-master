-- Create Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Event Attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Set up Row Level Security for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public events are viewable by everyone." ON events;
DROP POLICY IF EXISTS "Users can insert their own events." ON events;
DROP POLICY IF EXISTS "Users can update their own events." ON events;
DROP POLICY IF EXISTS "Users can delete their own events." ON events;

-- Create policies for events
CREATE POLICY "Public events are viewable by everyone." ON events FOR SELECT USING (true);
CREATE POLICY "Users can insert their own events." ON events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own events." ON events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own events." ON events FOR DELETE USING (auth.uid() = created_by);

-- Set up Row Level Security for event_attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public event attendees are viewable by everyone." ON event_attendees;
DROP POLICY IF EXISTS "Users can insert their own event attendance." ON event_attendees;
DROP POLICY IF EXISTS "Users can delete their own event attendance." ON event_attendees;

-- Create policies for event_attendees
CREATE POLICY "Public event attendees are viewable by everyone." ON event_attendees FOR SELECT USING (true);
CREATE POLICY "Users can insert their own event attendance." ON event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own event attendance." ON event_attendees FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample events for testing
INSERT INTO events (name, description, date, time, location, image_url, created_by) VALUES 
(
  'Heritage Walking Tour',
  'Explore the historic downtown district and discover hidden gems that tell the story of our city''s rich past.',
  '2024-12-15',
  '10:00 AM',
  'Downtown Heritage District',
  'https://images.pexels.com/photos/1707310/pexels-photo-1707310.jpeg',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Photography Workshop',
  'Learn to capture the beauty of historic architecture and urban landscapes with professional photography techniques.',
  '2024-12-18',
  '2:00 PM',
  'Cathedral Square',
  'https://images.pexels.com/photos/606539/pexels-photo-606539.jpeg',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Local Stories Meetup',
  'Share and hear fascinating stories from the past. Connect with fellow history enthusiasts and discover untold tales.',
  '2024-12-20',
  '7:00 PM',
  'Community Center',
  'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;
