import { supabase } from './supabase';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  last_seen?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file';
  media_url?: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  reply_to_id?: string;
  sender?: Profile;
  reply_to?: Message;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_id?: string;
  last_message_at: string;
  last_message?: Message;
  participants: Profile[];
  other_participant?: Profile;
}

export interface Call {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  status: 'pending' | 'accepted' | 'rejected' | 'ended' | 'missed';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  caller?: Profile;
  callee?: Profile;
  offer?: any;
  answer?: any;
  daily_room_url?: string;
  // Agora-specific fields
  agora_channel?: string;
  agora_token?: string;
}

export class ChatService {
  // Get all conversations for the current user
  static async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First get conversations for the user
    const { data: userConversations, error: convError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (convError) throw convError;

    if (!userConversations || userConversations.length === 0) {
      return [];
    }

    const conversationIds = userConversations.map(uc => uc.conversation_id);

    // Get full conversation data
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        last_message:messages!conversations_last_message_id_fkey(
          id,
          content,
          message_type,
          created_at,
          sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
        )
      `)
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Replicating the exact working logic from the individual chat screen, as requested.
    const conversationsWithParticipants = await Promise.all(
      (data || []).map(async (conv: any) => {
        try {
          let otherParticipant: Profile | null = null;

          // Method 1: Get conversation participants
          const { data: participants, error } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles!conversation_participants_user_id_fkey (
                id,
                full_name,
                username,
                avatar_url,
                last_seen
              )
            `)
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);

          if (!error && participants && participants.length > 0) {
            const participant = participants[0];
            const otherUserProfile = participant.profiles;
            if (otherUserProfile && !Array.isArray(otherUserProfile)) {
              otherParticipant = otherUserProfile as Profile;
            }
          }

          // Method 2: Get the other participant directly by getting all participants and filtering
          if (!otherParticipant) {
            const { data: allParticipants, error: allError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', user.id);

            if (!allError && allParticipants && allParticipants.length > 0) {
              const otherUserId = allParticipants[0].user_id;
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, last_seen')
                .eq('id', otherUserId)
                .single();

              if (!profileError && profile) {
                otherParticipant = profile;
              }
            }
          }
          
          // Method 3: Last resort - get any profile that's not the current user
          if (!otherParticipant) {
              const { data: directProfile, error: directError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, last_seen')
                .neq('id', user.id)
                .limit(1);

              if (!directError && directProfile && directProfile.length > 0) {
                otherParticipant = directProfile[0];
              }
          }

          return {
            ...conv,
            participants: otherParticipant ? [otherParticipant] : [],
            other_participant: otherParticipant,
          };
        } catch (error) {
          console.error(`Error fetching participants for conversation ${conv.id}:`, error);
          return {
            ...conv,
            participants: [],
            other_participant: null,
          };
        }
      })
    );

    return conversationsWithParticipants;
  }

  // Get or create a conversation between two users
  static async getOrCreateConversation(otherUserId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      user1_id: user.id,
      user2_id: otherUserId
    });

    if (error) throw error;
    return data;
  }

  // Get messages for a conversation
  static async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    const messages = data?.reverse() || [];
    
    return messages;
  }

  // Send a message
  static async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text',
    mediaUrl?: string,
    replyToId?: string
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        reply_to_id: replyToId
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    
    return data;
  }

  // Mark messages as read
  static async markMessagesAsRead(messageIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const readStatusData = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: user.id
    }));

    const { error } = await supabase
      .from('message_read_status')
      .upsert(readStatusData, { onConflict: 'message_id,user_id' });

    if (error) throw error;
  }

  // Get unread message count for a conversation
  static async getUnreadCount(conversationId: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated for unread count');
        return 0;
      }

      // First, get all messages in the conversation that are not from the current user
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);

      if (messagesError) {
        console.error('Error fetching messages for unread count:', messagesError);
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      if (!messages || messages.length === 0) {
        return 0;
      }

      const messageIds = messages.map(m => m.id);

      // Then, get the read status for these messages
      const { data: readStatuses, error: readError } = await supabase
        .from('message_read_status')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      if (readError) {
        console.error('Error fetching read statuses:', readError);
        throw new Error(`Failed to fetch read statuses: ${readError.message}`);
      }

      // Calculate unread count
      const readMessageIds = new Set((readStatuses || []).map(rs => rs.message_id));
      const unreadCount = messageIds.filter(id => !readMessageIds.has(id)).length;
      
      console.log(`Unread count for conversation ${conversationId}: ${unreadCount}`);
      return unreadCount;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      // Return 0 instead of throwing to prevent UI crashes
      return 0;
    }
  }

  // Subscribe to new messages in a conversation
  static subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the complete message with relations
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();
  }

  // Subscribe to conversation updates
  static subscribeToConversations(userId: string, callback: (payload: any) => void) {
    const conversationUpdates = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Here, you might want to re-fetch the specific conversation
          // to get all the latest details including the last message.
          callback({ type: 'conversation_update', data: payload.new });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // A new conversation participant entry means a new conversation for the user.
          callback({ type: 'new_conversation', data: payload.new });
        }
      )
      .subscribe();

    return conversationUpdates;
  }

  // Subscribe to message read-status updates for the current user
  static subscribeToReadStatus(userId: string, callback: (payload: any) => void) {
    const readStatusUpdates = supabase
      .channel(`read-status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_read_status',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Any change to read status for this user should refresh unread counts
          callback({ type: 'read_status', data: payload.new ?? payload.old });
        }
      )
      .subscribe();

    return readStatusUpdates;
  }

  // Upload media for chat
  static async uploadMedia(
    file: File | Blob,
    fileName: string,
    conversationId: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const filePath = `${conversationId}/${user.id}/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  // Start a call
  static async startCall(
    conversationId: string,
    calleeId: string,
    callType: 'audio' | 'video'
  ): Promise<Call> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        callee_id: calleeId,
        call_type: callType,
      })
      .select(`
        *,
        caller:profiles!calls_caller_id_fkey(id, username, full_name, avatar_url),
        callee:profiles!calls_callee_id_fkey(id, username, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Update call status
  static async updateCallStatus(
    callId: string,
    status: 'accepted' | 'rejected' | 'ended' | 'missed',
    durationSeconds?: number
  ): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'ended' && durationSeconds !== undefined) {
      updateData.ended_at = new Date().toISOString();
      updateData.duration_seconds = durationSeconds;
    }

    const { error } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', callId);

    if (error) throw error;
  }

  // Subscribe to incoming calls
  static subscribeToIncomingCalls(callback: (call: Call) => void) {
    return supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls'
        },
        async (payload) => {
          try {
            console.log('New call detected:', payload.new);
            
            // Get the current user to filter calls
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.log('No authenticated user for call subscription');
              return;
            }

            // Only process calls where the current user is the callee
            if (payload.new.callee_id !== user.id) {
              console.log('Call not for current user, ignoring');
              return;
            }

            const { data, error } = await supabase
              .from('calls')
              .select(`
                *,
                caller:profiles!calls_caller_id_fkey(id, username, full_name, avatar_url),
                callee:profiles!calls_callee_id_fkey(id, username, full_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching call details:', error);
              return;
            }

            if (data) {
              console.log('Incoming call for current user:', data);
              callback(data);
            }
          } catch (error) {
            console.error('Error processing incoming call:', error);
          }
        }
      )
      .subscribe();
  }

  // Subscribe to call updates
  static subscribeToCallUpdates(callId: string, callback: (call: Call) => void) {
    return supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`
        },
        async (payload) => {
          const { data } = await supabase
            .from('calls')
            .select(`
              *,
              caller:profiles!calls_caller_id_fkey(id, username, full_name, avatar_url),
              callee:profiles!calls_callee_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();
  }

  // Search users for starting new conversations
  static async searchUsers(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Get call history
  static async getCallHistory(conversationId?: string): Promise<Call[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('calls')
      .select(`
        *,
        caller:profiles!calls_caller_id_fkey(id, username, full_name, avatar_url),
        callee:profiles!calls_callee_id_fkey(id, username, full_name, avatar_url)
      `)
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .order('started_at', { ascending: false });

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}
