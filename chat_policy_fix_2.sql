-- Drop the old, incorrect policies
DROP POLICY IF EXISTS "Users can view participants of their own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants into their own conversations" ON conversation_participants;

-- Create a new, non-recursive SELECT policy on conversation_participants
CREATE POLICY "Users can view participants of their own conversations" ON conversation_participants
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Create a new, non-recursive INSERT policy on conversation_participants
CREATE POLICY "Users can insert participants into their own conversations" ON conversation_participants
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);
