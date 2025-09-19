-- Drop the old, incorrect policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;

-- Create a new, more permissive SELECT policy on conversation_participants
CREATE POLICY "Users can view participants of their own conversations" ON conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Create a new, more permissive INSERT policy on conversation_participants
CREATE POLICY "Users can insert participants into their own conversations" ON conversation_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
  )
);
