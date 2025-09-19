-- Create privacy_settings table
CREATE TABLE privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  location_sharing BOOLEAN DEFAULT true,
  activity_status BOOLEAN DEFAULT true,
  message_requests BOOLEAN DEFAULT true,
  photo_tagging BOOLEAN DEFAULT true,
  search_visibility BOOLEAN DEFAULT true,
  analytics_sharing BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for privacy_settings
CREATE POLICY "Users can view their own privacy settings" 
ON privacy_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" 
ON privacy_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
ON privacy_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own privacy settings" 
ON privacy_settings FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_privacy_settings_updated_at();
