-- Create the conversations table for 1-to-1 chats (without last_message_id initially)


DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

DROP POLICY IF EXISTS "Users can view message read status" ON message_read_status;
DROP POLICY IF EXISTS "Users can insert their own message read status" ON message_read_status;
DROP POLICY IF EXISTS "Users can update their own message read status" ON message_read_status;

DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
DROP POLICY IF EXISTS "Users can insert calls they initiate" ON calls;
DROP POLICY IF EXISTS "Users can update calls they're part of" ON calls;

-- Drop all triggers
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;

-- Drop tables
DROP TABLE IF EXISTS calls, messages, conversation_participants, conversations, message_read_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_conversation_last_message, get_or_create_conversation;

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the conversation_participants table
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Create the messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  reply_to_id UUID
);

-- Add the self-referencing foreign key constraint after table creation
ALTER TABLE messages 
ADD CONSTRAINT messages_reply_to_id_fkey 
FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Create the message_read_status table
CREATE TABLE message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create the calls table for video/audio calls
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ended', 'missed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0
);

-- Add the last_message_id column and foreign key constraint after messages table is created
ALTER TABLE conversations 
ADD COLUMN last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Enable Row Level Security (RLS) for all tables

-- Conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversation_participants cp 
  WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can insert conversations" ON conversations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own conversations" ON conversations FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM conversation_participants cp 
  WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
));

-- Conversation Participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversation participants" ON conversation_participants FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert conversation participants" ON conversation_participants FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversation_participants cp 
  WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can insert messages in their conversations" ON messages FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE 
USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE 
USING (sender_id = auth.uid());

-- Message Read Status
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view message read status" ON message_read_status FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM messages m 
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id 
  WHERE m.id = message_read_status.message_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own message read status" ON message_read_status FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message read status" ON message_read_status FOR UPDATE 
USING (user_id = auth.uid());

-- Calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own calls" ON calls FOR SELECT 
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can insert calls they initiate" ON calls FOR INSERT 
WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can update calls they're part of" ON calls FOR UPDATE 
USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Storage policies for chat media
CREATE POLICY "Users can upload chat media" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'chat-media'
);

CREATE POLICY "Users can view chat media" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'chat-media'
);

CREATE POLICY "Users can update their own chat media" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'chat-media'
);

CREATE POLICY "Users can delete their own chat media" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'chat-media'
);

-- Create indexes for better performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_calls_caller_id ON calls(caller_id);
CREATE INDEX idx_calls_callee_id ON calls(callee_id);
CREATE INDEX idx_calls_conversation_id ON calls(conversation_id);

-- Create functions for real-time functionality
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_id = NEW.id, 
      last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversation last message
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Create function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE c.id IN (
    SELECT cp1.conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = user1_id AND cp2.user_id = user2_id
    AND cp1.user_id != cp2.user_id
  );
  
  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id, user1_id), (conversation_id, user2_id);
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
