# Chat System Documentation

## Overview

This chat system provides comprehensive 1-to-1 messaging functionality with real-time features, media sharing, and video/audio calling capabilities. The system is built using React Native, Expo, Supabase for backend services, and includes real-time synchronization.

## Features

### ✅ Implemented Features

1. **Real-time Messaging**
   - Text messages with instant delivery
   - Real-time message synchronization
   - Message read status tracking
   - Message timestamps

2. **Media Sharing**
   - Image sharing with upload to cloud storage
   - Video sharing support
   - Audio message recording and playback
   - File attachment support

3. **Video & Audio Calls**
   - Video calling with camera preview
   - Audio-only calling
   - Call status management (pending, accepted, rejected, ended)
   - Call duration tracking
   - Camera and microphone controls during calls

4. **Chat Management**
   - List of all conversations
   - User search functionality to start new chats
   - Conversation creation and management
   - Last message preview in chat list

5. **User Interface**
   - Modern, intuitive chat interface
   - Message bubbles with sender identification
   - Typing indicators
   - Smooth scrolling and pagination
   - Dark mode support for video calls

## Database Schema

### Core Tables

1. **conversations**
   - Manages 1-to-1 chat sessions
   - Tracks last message and update timestamps

2. **conversation_participants**
   - Links users to conversations
   - Supports future group chat expansion

3. **messages**
   - Stores all message content and metadata
   - Supports text, image, video, audio, and file types
   - Includes reply functionality

4. **message_read_status**
   - Tracks read receipts for messages
   - Enables unread message counting

5. **calls**
   - Manages video and audio call sessions
   - Tracks call status and duration

## File Structure

```
app/
├── chat/
│   └── [id].tsx              # Individual chat screen
├── chats.tsx                 # Chat list screen
└── (tabs)/
    └── chats.tsx             # Chat tab wrapper

components/
├── VideoCallModal.tsx        # Video/Audio call interface

lib/
├── chatService.ts            # Chat service with all API methods
└── supabase.ts              # Supabase client configuration

chat_migration.sql            # Database schema and setup
```

## Key Components

### 1. ChatService (`lib/chatService.ts`)

Central service handling all chat operations:

- **getConversations()** - Fetch user's conversations
- **getOrCreateConversation()** - Start new chat or get existing
- **getMessages()** - Load messages for a conversation
- **sendMessage()** - Send text/media messages
- **markMessagesAsRead()** - Update read status
- **uploadMedia()** - Handle file uploads
- **startCall()** - Initiate video/audio calls
- **subscribeToMessages()** - Real-time message updates
- **subscribeToIncomingCalls()** - Real-time call notifications

### 2. Chat List Screen (`app/chats.tsx`)

Features:
- Display all user conversations
- Search functionality to find new users
- Pull-to-refresh capability
- Real-time conversation updates
- Last message preview with timestamps

### 3. Individual Chat Screen (`app/chat/[id].tsx`)

Features:
- Message display with sender identification
- Text input with send functionality
- Media picker for images/videos
- Audio recording capability
- Video/audio call initiation
- Real-time message reception
- Message read status tracking

### 4. Video Call Modal (`components/VideoCallModal.tsx`)

Features:
- Full-screen video call interface
- Camera permission management
- Video/audio toggle controls
- Call timer and status display
- Local camera preview
- Call termination handling

## Real-time Features

The system uses Supabase's real-time capabilities for:

1. **Message Synchronization**
   - New messages appear instantly
   - Automatic scroll to latest message
   - Real-time typing indicators

2. **Call Management**
   - Incoming call notifications
   - Call status updates
   - Real-time call duration tracking

3. **Conversation Updates**
   - Last message updates in chat list
   - Unread message counting
   - Online status indicators

## Setup Instructions

### 1. Database Setup

Run the migration script to create all necessary tables:

```sql
-- Execute chat_migration.sql in your Supabase SQL editor
```

### 2. Storage Setup

Create storage buckets in Supabase:

```sql
-- Create chat-media bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true);
```

### 3. Permissions

Ensure these permissions are granted:
- Camera access for video calls
- Microphone access for audio calls and voice messages
- Storage access for media uploads

### 4. Environment Variables

Configure in your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage Guide

### Starting a New Chat

1. Navigate to the Chats tab
2. Tap the "+" button to search for users
3. Select a user from search results
4. Start messaging immediately

### Sending Messages

1. Type in the text input field
2. Tap send button or press enter
3. For media: tap image icon to select photos/videos
4. For voice: hold microphone button to record

### Making Calls

1. Open any conversation
2. Tap the phone icon for audio call
3. Tap the video camera icon for video call
4. Use on-screen controls during the call

## Technical Implementation Details

### Real-time Subscriptions

```typescript
// Message subscription
const subscription = ChatService.subscribeToMessages(
  conversationId, 
  (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
  }
);

// Call subscription
const callSub = ChatService.subscribeToIncomingCalls((call) => {
  if (call.callee_id === user?.id) {
    setActiveCall(call);
    setShowCallModal(true);
  }
});
```

### Media Upload Process

```typescript
// Upload flow
const response = await fetch(fileUri);
const blob = await response.blob();
const mediaUrl = await ChatService.uploadMedia(blob, fileName, conversationId);
const message = await ChatService.sendMessage(conversationId, '', 'image', mediaUrl);
```

### Video Call Implementation

```typescript
// Video call setup
const call = await ChatService.startCall(conversationId, calleeId, 'video');
setActiveCall(call);
setShowCallModal(true);
```

## Security Features

1. **Row Level Security (RLS)**
   - Users can only access their own conversations
   - Message visibility restricted to participants
   - Call records protected by participant check

2. **File Upload Security**
   - Authenticated uploads only
   - User-specific folder structure
   - File type validation

3. **Real-time Security**
   - Authenticated connections required
   - User-specific channel subscriptions
   - Automatic permission checking

## Future Enhancements

### Potential Additions

1. **Group Chats**
   - Multi-user conversations
   - Admin controls
   - Member management

2. **Advanced Features**
   - Message reactions
   - Message forwarding
   - Chat backup and export

3. **Call Improvements**
   - Screen sharing
   - Conference calls
   - Call recording

4. **Notifications**
   - Push notifications for new messages
   - Call notifications when app is closed
   - Custom notification sounds

## Troubleshooting

### Common Issues

1. **Messages not appearing in real-time**
   - Check internet connection
   - Verify Supabase connection
   - Ensure proper authentication

2. **Video calls not working**
   - Verify camera/microphone permissions
   - Check device compatibility
   - Ensure proper network connectivity

3. **File uploads failing**
   - Check storage bucket configuration
   - Verify upload permissions
   - Ensure file size limits

### Debug Tips

```typescript
// Enable debug logging
console.log('Chat Service Debug:', {
  user: user?.id,
  conversationId,
  messageCount: messages.length,
  hasPermissions: { camera: cameraPermission, mic: micPermission }
});
```

## Performance Considerations

1. **Message Pagination**
   - Load messages in batches of 50
   - Implement infinite scrolling for history
   - Cache recent conversations

2. **Media Optimization**
   - Compress images before upload
   - Use appropriate video quality settings
   - Implement progressive loading

3. **Real-time Optimization**
   - Unsubscribe from channels when not needed
   - Batch message updates
   - Minimize re-renders

This chat system provides a solid foundation for real-time communication with room for future enhancements and customization based on specific requirements.
