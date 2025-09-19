-- Create location_alerts table
CREATE TABLE IF NOT EXISTS location_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 100, -- radius in meters
  alert_type TEXT CHECK (alert_type IN ('location', 'proximity', 'story', 'emergency', 'weather', 'crime', 'riot', 'disaster')) DEFAULT 'location',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  source TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_location_alerts_user_id ON location_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_location_alerts_created_at ON location_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_alerts_is_read ON location_alerts(is_read);

-- Enable RLS (Row Level Security)
ALTER TABLE location_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own location alerts" ON location_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location alerts" ON location_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location alerts" ON location_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location alerts" ON location_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_location_alerts_updated_at
  BEFORE UPDATE ON location_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
