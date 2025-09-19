import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { ModernAlert } from '@/utils/modernAlert';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService, Message, Profile, Call } from '@/lib/chatService';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
// Define the complete shape of our styles object
type ChatScreenStyles = {
  // Container styles
  container: any;
  chatContainer: any;
  
  // Header styles
  header: any;
  headerContent: any;
  headerBackButton: any;
  headerLeft: any;
  headerActionRow: any;
  headerActionButton: any;
  
  // Avatar styles
  avatarContainer: any;
  headerAvatar: any;
  onlineIndicator: any;
  
  // User info styles
  headerUserInfo: any;
  headerUserName: any;
  headerUserStatus: any;
  
  // Loading states
  loadingMessages: any;
  loadingIndicatorContainer: any;
  loadingText: any;
  
  // Skeleton loading
  skeletonMessage: any;
  skeletonBubble: any;
  skeletonBubbleOwn: any;
  skeletonText: any;
  
  // Chat list
  flatList: any;
  
  // Empty state
  emptyState: any;
  emptyStateIcon: any;
  emptyStateTitle: any;
  emptyStateText: any;
  
  // Input bar
  inputBar: any;
  inputOptionsRow: any;
  inputOption: any;
  inputOptionText: any;
  inputOptionGallery: any;
  inputOptionTextGallery: any;
  inputOptionVoice: any;
  inputOptionTextVoice: any;
  inputRow: any;
  inputAddButton: any;
  inputTextBox: any;
  inputSendButton: any;
  inputSendButtonRecording: any;
};

// Import styles with fallback
let styles: ChatScreenStyles;
try {
  styles = require('../ChatDetailsScreen.styles').default as ChatScreenStyles;
  console.log('Chat screen styles loaded successfully');
} catch (error) {
  console.error('Error loading styles:', error);
  // Fallback styles if import fails
  console.log('Using fallback styles');
  styles = {
    // Container styles
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    chatContainer: {
      flex: 1,
    },
    
    // Header styles
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#8B5CF6',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerBackButton: {
      padding: 8,
      marginRight: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerActionButton: {
      padding: 8,
      marginLeft: 8,
    },
    
    // Avatar styles
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#E9D5FF',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#10B981',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    
    // User info styles
    headerUserInfo: {},
    headerUserName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    headerUserStatus: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    
    // Loading states
    loadingMessages: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingIndicatorContainer: {
      padding: 20,
    },
    loadingText: {
      marginTop: 8,
      color: '#6B7280',
    },
    
    // Skeleton loading
    skeletonMessage: {
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    skeletonBubble: {
      width: '70%',
      height: 60,
      backgroundColor: '#E5E7EB',
      borderRadius: 12,
      marginBottom: 8,
    },
    skeletonBubbleOwn: {
      alignSelf: 'flex-end',
      backgroundColor: '#DDD6FE',
    },
    skeletonText: {
      height: 16,
      backgroundColor: '#E5E7EB',
      borderRadius: 4,
      marginBottom: 4,
    },
    
    // Chat list
    flatList: {
      flex: 1,
    },
    
    // Empty state
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
      color: '#1F2937',
    },
    emptyStateText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    
    // Input bar
    inputBar: {
      padding: 12,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    inputOptionsRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    inputOption: {
      padding: 8,
      marginRight: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputOptionText: {
      marginLeft: 8,
      color: '#4B5563',
      fontSize: 14,
    },
    inputOptionGallery: {},
    inputOptionTextGallery: {},
    inputOptionVoice: {},
    inputOptionTextVoice: {},
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputAddButton: {
      padding: 8,
      marginRight: 8,
    },
    inputTextBox: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
    },
    inputSendButton: {
      marginLeft: 8,
      padding: 10,
      backgroundColor: '#8B5CF6',
      borderRadius: 20,
    },
    inputSendButtonRecording: {
      backgroundColor: '#EF4444',
    },
  };
}

// Using relative paths since @/ alias might not be properly configured
import MessageItem from '../../components/MessageItem';
import { useCallback } from 'react';

const { width, height } = Dimensions.get('window');

function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const otherUserRef = useRef<Profile | null>(null);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);
  const [callSubscription, setCallSubscription] = useState<RealtimeChannel | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [callInterval, setCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showInputOptions, setShowInputOptions] = useState(false);
  const [otherUserIsTyping, setOtherUserIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [waveAnimation] = useState(new Animated.Value(0));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      waveAnimation.setValue(0);
    }
  }, [isRecording]);

  useEffect(() => {
    if (user && id) {
      loadMessages();
      if (!subscription) {
        setupRealtimeSubscription();
      }
      if (!callSubscription) {
        setupCallSubscription();
      }
    }

    return () => {
      if (subscription) {
        console.log('Unsubscribing from chat subscription');
        subscription.unsubscribe();
        setSubscription(null);
      }
      if (callSubscription) {
        console.log('Unsubscribing from call subscription');
        callSubscription.unsubscribe();
        setCallSubscription(null);
      }
      if (callInterval) {
        clearInterval(callInterval);
      }
    };
  }, [user, id, subscription, callSubscription]);

  useEffect(() => {
    if (otherUser) {
      otherUserRef.current = otherUser;

      const checkOnlineStatus = () => {
        if (otherUser.last_seen) {
          const lastSeen = new Date(otherUser.last_seen).getTime();
          const now = new Date().getTime();
          const diff = now - lastSeen;
          setIsOtherUserOnline(diff < 2 * 60 * 1000);
        }
      };

      checkOnlineStatus();
      const interval = setInterval(checkOnlineStatus, 60000);

      return () => clearInterval(interval);
    }
  }, [otherUser]);

  const loadMessages = async () => {
    if (!id) {
      console.warn('No conversation ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await loadOtherUserInfo();
      
      const data = await ChatService.getMessages(id);
      if (data && Array.isArray(data)) {
        setMessages(data);
        
        if (!otherUserRef.current && data.length > 0) {
          await loadOtherUserFromMessages(data);
        }
      } else {
        console.warn('Unexpected data format from ChatService.getMessages:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      ModernAlert.error('Error', 'Failed to load messages. Please try again.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOtherUserFromMessages = async (messages: Message[]) => {
    if (otherUserRef.current) {
      return;
    }

    const otherMessage = messages.find(m => m.sender_id !== user?.id);
    if (otherMessage && otherMessage.sender && otherMessage.sender.id !== user?.id) {
      setOtherUser(otherMessage.sender);
      otherUserRef.current = otherMessage.sender;
      return;
    }
  };

  const loadOtherUserInfo = async () => {
    if (!id || !user?.id) {
      console.warn('Missing required IDs for loading other user info');
      return;
    }

    try {
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
        .eq('conversation_id', id)
        .neq('user_id', user.id);

      if (error) {
        console.error('Supabase query error:', error);
        return;
      }

      if (participants && participants.length > 0) {
        const participant = participants[0];
        if (participant && participant.profiles && !Array.isArray(participant.profiles)) {
          const otherUserProfile = participant.profiles as Profile;
          setOtherUser(otherUserProfile);
          otherUserRef.current = otherUserProfile;
        }
      } else {
        console.warn('No participants found for conversation:', id);
      }
    } catch (error) {
      console.error('Error loading other user info:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`chat:${id}`);
  
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, async (payload) => {
        const { data: newMessage, error } = await supabase
          .from('messages')
          .select('*, sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        
        if (newMessage) {
          setMessages(prev => [...prev, newMessage as Message]);
          if (newMessage.sender_id !== user?.id) {
            ChatService.markMessagesAsRead([newMessage.id]);
          }
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.sender_id !== user?.id) {
          setOtherUserIsTyping(true);
          setTimeout(() => setOtherUserIsTyping(false), 3000);
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription started');
        }
      });
  
    setSubscription(channel);
  };

  const setupCallSubscription = () => {
    console.log('Setting up call subscription for user:', user?.id);
    const sub = ChatService.subscribeToIncomingCalls((call) => {
      console.log('Received incoming call:', call);
      console.log('Current user ID:', user?.id);
      console.log('Call callee ID:', call.callee_id);
      console.log('Current conversation ID:', id);
      console.log('Call conversation ID:', call.conversation_id);
      
      if (call.callee_id === user?.id && call.conversation_id === id) {
        console.log('Call is for current user in current conversation - navigating to call');
        setActiveCall(call);
        // Navigate to Agora call screen for incoming calls
        const channel = `conv_${id}`;
        router.push(`/call/${encodeURIComponent(channel)}`);
      } else {
        console.log('Call not for current user or conversation - ignoring');
      }
    });
    setCallSubscription(sub);
    console.log('Call subscription set up successfully');
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    setSending(true);
    try {
      await ChatService.sendMessage(id!, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      ModernAlert.error('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
    if (subscription) {
      subscription.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender_id: user?.id },
      });
    }
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSending(true);
        setShowInputOptions(false);
        
        const fileExt = asset.uri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('chat-media')
          .upload(filePath, {
            uri: asset.uri,
            type: `${asset.type}/${fileExt}`,
            name: filePath,
          } as any);

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(data.path);
        const mediaUrl = urlData.publicUrl;
        
        await ChatService.sendMessage(
          id!, 
          '', 
          asset.type === 'video' ? 'video' : 'image',
          mediaUrl
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      ModernAlert.error('Error', 'Failed to upload image');
    } finally {
      setSending(false);
    }
  };

  const handleCameraPicker = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSending(true);
        setShowInputOptions(false);
        
        const fileExt = asset.uri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('chat-media')
          .upload(filePath, {
            uri: asset.uri,
            type: `${asset.type}/${fileExt}`,
            name: filePath,
          } as any);

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(data.path);
        const mediaUrl = urlData.publicUrl;
        
        await ChatService.sendMessage(
          id!, 
          '', 
          asset.type === 'video' ? 'video' : 'image',
          mediaUrl
        );
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      ModernAlert.error('Error', 'Failed to take photo');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        ModernAlert.error('Permission Required', 'Audio recording permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setShowInputOptions(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      ModernAlert.error('Error', 'Failed to start recording');
    }
  };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            
            if (uri) {
                setSending(true);
                
                const fileInfo = await FileSystem.getInfoAsync(uri);
                if (!fileInfo.exists) {
                    throw new Error('File does not exist');
                }

                const fileExt = uri.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data, error } = await supabase.storage
                  .from('chat-media')
                  .upload(filePath, {
                    uri: uri,
                    type: `audio/${fileExt}`,
                    name: filePath,
                  } as any);

                if (error) {
                  throw error;
                }

                const { data: urlData } = supabase.storage
                  .from('chat-media')
                  .getPublicUrl(data.path);
                const mediaUrl = urlData.publicUrl;
                
                await ChatService.sendMessage(id!, '', 'audio', mediaUrl);
            }
            
            setRecording(null);
        } catch (error) {
            console.error('Error stopping recording:', error);
            ModernAlert.error('Error', 'Failed to save recording');
        } finally {
            setSending(false);
        }
    };

  const startCall = async (callType: 'audio' | 'video') => {
    if (!otherUser) return;

    try {
      const call = await ChatService.startCall(id!, otherUser.id, callType);
      setActiveCall(call);
      setCallTimer(0);
      
      // For video calls, navigate to the Agora call screen immediately
      if (callType === 'video' && id) {
        const channel = `conv_${id}`; // deterministic channel based on conversation id
        router.push(`/call/${encodeURIComponent(channel)}`);
      }

      const interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
      setCallInterval(interval as unknown as NodeJS.Timeout);
    } catch (error) {
      console.error('Error starting call:', error);
      ModernAlert.error('Error', 'Failed to start call');
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      await ChatService.updateCallStatus(activeCall.id, 'ended', callTimer);
      setActiveCall(null);
      setCallTimer(0);
      
      if (callInterval) {
        clearInterval(callInterval as NodeJS.Timeout);
        setCallInterval(null);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = useCallback(async (uri: string) => {
    if (playingAudio === uri) {
      setPlayingAudio(null);
    } else {
      if (playingAudio) {
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      setPlayingAudio(uri);
    }
  }, [playingAudio]);

  const formatMessageTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    const isGroupStart = !prevMessage || prevMessage.sender_id !== item.sender_id;
    const isGroupEnd = !nextMessage || nextMessage.sender_id !== item.sender_id;

    const showTime = !prevMessage ||
      new Date(item.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000;

    return (
      <MessageItem
        item={item}
        isOwn={isOwn}
        isGroupStart={isGroupStart}
        isGroupEnd={isGroupEnd}
        showTime={showTime}
        formatMessageTime={formatMessageTime}
        onPlayAudio={playAudio}
        onSetSelectedImage={setSelectedImage}
        playingAudio={playingAudio}
      />
    );
  }, [user, playingAudio, playAudio, formatMessageTime, messages]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBackButton}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {otherUser?.avatar_url ? (
                  <Image
                    source={{
                      uri: otherUser.avatar_url
                    }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <View style={[styles.headerAvatar, { backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }]}>
                    {otherUser ? (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                        {(otherUser.full_name || otherUser.username || '').charAt(0).toUpperCase()}
                      </Text>
                    ) : (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    )}
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.headerUserInfo}>
                <Text style={styles.headerUserName}>
                  {otherUser ? (otherUser.full_name || otherUser.username || 'Unknown User') : 'Loading...'}
                </Text>
                <Text style={styles.headerUserStatus}>
                  {loading ? 'Connecting...' : (otherUserIsTyping ? 'typing...' : (isOtherUserOnline ? 'Online' : 'Offline'))}
                </Text>
              </View>
            </View>

            <View style={styles.headerActionRow}>
              <TouchableOpacity
                onPress={() => startCall('audio')}
                style={[styles.headerActionButton, { opacity: otherUser ? 1 : 0.5 }]}
                disabled={!otherUser}
              >
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => startCall('video')}
                style={[styles.headerActionButton, { opacity: otherUser ? 1 : 0.5 }]}
                disabled={!otherUser}
              >
                <Ionicons name="videocam" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.chatContainer}>
          {loading ? (
            <View style={styles.loadingMessages}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.skeletonMessage}>
                  <View style={[styles.skeletonBubble, i % 2 === 0 && styles.skeletonBubbleOwn]}>
                    <View style={styles.skeletonText} />
                    <View style={[styles.skeletonText, { width: '70%' }]} />
                  </View>
                </View>
              ))}
              <View style={styles.loadingIndicatorContainer}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `${item.id}-${index}-${item.created_at}`}
              style={styles.flatList}
              contentContainerStyle={{ paddingBottom: 20, paddingTop: 16 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              onLayout={() => flatListRef.current?.scrollToEnd()}
              showsVerticalScrollIndicator={false}
              extraData={messages}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                      <Ionicons name="chatbubbles" size={48} color="#D1D5DB" />
                    </View>
                    <Text style={styles.emptyStateTitle}>Start the conversation</Text>
                    <Text style={styles.emptyStateText}>
                      Send a message to begin chatting with {otherUser?.full_name || 'this user'}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        <View style={styles.inputBar}>
          {showInputOptions && (
            <View style={styles.inputOptionsRow}>
              <TouchableOpacity
                onPress={handleCameraPicker}
                style={styles.inputOption}
              >
                <Ionicons name="camera" size={24} color="#3B82F6" />
                <Text style={[styles.inputOptionText, { color: '#3B82F6' }]}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleImagePicker}
                style={[styles.inputOption, styles.inputOptionGallery]}
              >
                <Ionicons name="image" size={24} color="#10B981" />
                <Text style={[styles.inputOptionText, styles.inputOptionTextGallery]}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={startRecording}
                style={[styles.inputOption, styles.inputOptionVoice]}
              >
                <Ionicons name="mic" size={24} color="#8B5CF6" />
                <Text style={[styles.inputOptionText, styles.inputOptionTextVoice]}>Voice</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={() => setShowInputOptions(!showInputOptions)}
              style={styles.inputAddButton}
            >
              <Ionicons
                name={showInputOptions ? "close" : "add"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.inputTextBox}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />

            {messageText.trim() ? (
              <TouchableOpacity
                onPress={sendMessage}
                disabled={sending}
                style={styles.inputSendButton}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={18} color="white" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                style={[
                  styles.inputSendButton,
                  isRecording && styles.inputSendButtonRecording,
                ]}
              >
                <Animated.View
                  style={{
                    opacity: isRecording ? waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.5],
                    }) : 1,
                    transform: [
                      {
                        scale: isRecording ? waveAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.5],
                        }) : 1,
                      },
                    ],
                  }}
                >
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={18}
                    color="white"
                  />
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>


      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 1 }}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage! }}
            style={{ width: '100%', height: '80%' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ChatScreen;
