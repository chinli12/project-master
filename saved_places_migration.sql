-- Create saved_places table
CREATE TABLE saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'historical' CHECK (category IN ('historical', 'nature', 'cultural', 'restaurant', 'entertainment')),
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX idx_saved_places_category ON saved_places(category);
CREATE INDEX idx_saved_places_saved_at ON saved_places(saved_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_places
CREATE POLICY "Users can view their own saved places" 
ON saved_places FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved places" 
ON saved_places FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved places" 
ON saved_places FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved places" 
ON saved_places FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_places_updated_at
  BEFORE UPDATE ON saved_places
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_places_updated_at();
