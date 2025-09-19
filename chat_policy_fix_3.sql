-- Drop the old, incorrect policies
DROP POLICY IF EXISTS "Users can view participants of their own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants into their own conversations" ON conversation_participants;

-- Create a function to check if a user is a participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new, non-recursive SELECT policy on conversation_participants
CREATE POLICY "Users can view participants of their own conversations" ON conversation_participants
FOR SELECT
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

-- Create a new, non-recursive INSERT policy on conversation_participants
CREATE POLICY "Users can insert participants into their own conversations" ON conversation_participants
FOR INSERT
WITH CHECK (
  is_conversation_participant(conversation_id, auth.uid())
);
