import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { styles } from './ChatsScreen.styles';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService, Conversation, Profile } from '@/lib/chatService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function ChatsScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [otherUsers, setOtherUsers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscription();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showSearch ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showSearch]);

  const loadConversations = async () => {
    try {
      const data = await ChatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;
    const sub = ChatService.subscribeToConversations(user.id, (payload) => {
      if (payload.type === 'new_conversation') {
        loadConversations();
      } else if (payload.type === 'conversation_update') {
        const updatedConversation = payload.data;
        setConversations(prev =>
          prev.map(conv => {
            if (conv.id === updatedConversation.id) {
              return { ...conv, ...updatedConversation, other_participant: conv.other_participant };
            }
            return conv;
          })
        );
      }
    });
    setSubscription(sub);

    const presenceChannel = supabase.channel('online-users');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        setOnlineUsers(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
        setOnlineUsers(prev => ({ ...prev, [key]: newPresences[0] }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string, leftPresences: any[] }) => {
        setOnlineUsers(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      })
      .subscribe();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    if (query.trim().length < 2) return;

    setSearchLoading(true);
    try {
      const results = await ChatService.searchUsers(query);
      const filteredResults = results.filter(profile => profile.id !== user?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartNewChat = async (profile: Profile) => {
    try {
      setSearchLoading(true);
      const conversationId = await ChatService.getOrCreateConversation(profile.id);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      router.push({
        pathname: '/chat/[id]',
        params: { id: conversationId }
      });
    } catch (error) {
      console.error('Error starting new chat:', error);
      Alert.alert('Error', 'Failed to start new chat');
    } finally {
      setSearchLoading(false);
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return diffInDays === 1 ? 'Yesterday' : `${diffInDays}d`;
    }
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const otherUser = item.other_participant;
    const lastMessage = item.last_message;
    const hasUnread = false;
    const isOnline = otherUser && otherUser.last_seen && new Date().getTime() - new Date(otherUser.last_seen).getTime() < 2 * 60 * 1000;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => router.push({
          pathname: '/chat/[id]',
          params: { id: item.id }
        })}
        activeOpacity={0.7}
      >
        <View style={styles.conversationContent}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: otherUser?.avatar_url || 'https://via.placeholder.com/56'
              }}
              style={styles.avatar}
            />
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationTop}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {otherUser ? (otherUser.full_name || otherUser.username || 'Unknown User') : 'Loading...'}
              </Text>
              {lastMessage && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                  <Text style={styles.conversationTime}>
                    {formatLastMessageTime(lastMessage.created_at)}
                  </Text>
                  {hasUnread && <View style={styles.unreadDot} />}
                </View>
              )}
            </View>

            <View style={styles.conversationBottom}>
              <View style={styles.lastMessageRow}>
                {lastMessage?.sender_id === user?.id && (
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color={lastMessage?.is_read ? '#3B82F6' : '#9CA3AF'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.lastMessageText,
                    hasUnread && styles.lastMessageTextUnread,
                  ]}
                  numberOfLines={1}
                >
                  {lastMessage?.message_type === 'image' ? '📷 Photo' :
                    lastMessage?.message_type === 'audio' ? '🎵 Voice message' :
                      lastMessage?.message_type === 'video' ? '🎥 Video' :
                        lastMessage?.content || 'Start a conversation'}
                </Text>
              </View>

              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>1</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {index === conversations.length - 1 && (
          <View style={styles.divider} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => handleStartNewChat(item)}
    >
      <View style={styles.searchResultRow}>
        <Image
          source={{
            uri: item.avatar_url || 'https://via.placeholder.com/50'
          }}
          style={styles.searchResultAvatar}
        />
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName}>
            {item.full_name || item.username}
          </Text>
          {item.username && item.full_name && (
            <Text style={styles.searchResultUsername}>@{item.username}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.searchResultChevron} />
      </View>
    </TouchableOpacity>
  );

  const renderShimmerItem = () => (
    <View style={styles.conversationCard}>
      <View style={styles.conversationContent}>
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, { backgroundColor: '#E5E7EB' }]} />
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationTop}>
            <View style={{ backgroundColor: '#E5E7EB', height: 16, width: '60%', borderRadius: 8 }} />
            <View style={{ backgroundColor: '#E5E7EB', height: 12, width: 40, borderRadius: 6 }} />
          </View>
          <View style={styles.conversationBottom}>
            <View style={{ backgroundColor: '#E5E7EB', height: 14, width: '80%', borderRadius: 7, marginTop: 8 }} />
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity style={[styles.headerButton, { opacity: 0.5 }]} disabled>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, paddingTop: 16 }}>
            <FlatList
              data={[1, 2, 3, 4, 5, 6]}
              renderItem={renderShimmerItem}
              keyExtractor={(item) => item.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.headerButton}
          >
            <Ionicons
              name={showSearch ? "close" : "add"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users to start chatting..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={true}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color="#3B82F6" />
              )}
            </View>
          </View>
        )}

        <View style={{ flex: 1, paddingTop: 16 }}>
          {showSearch && searchQuery.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.searchEmptyIconWrapper}>
                    <Ionicons name="search" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.searchEmptyTitle}>
                    {searchLoading ? 'Searching...' : 'No users found'}
                  </Text>
                  <Text style={styles.searchEmptyText}>
                    Try searching with a different name
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrapper}>
                    <Ionicons name="chatbubbles" size={40} color="#3B82F6" />
                  </View>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptyText}>
                    Start connecting with people by tapping the + button above
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowSearch(true)}
                    style={styles.emptyButton}
                  >
                    <Text style={styles.emptyButtonText}>Start chatting</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
