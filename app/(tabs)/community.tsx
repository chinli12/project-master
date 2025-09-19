import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import { ModernAlert } from '@/utils/modernAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Heart, MessageCircle, Share, Camera, MapPin, Search, TrendingUp, Users, Compass } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import GroupsScreen from '../groups';
import EventsScreen from '../events';
import { supabase } from '../../lib/supabase';
import { Video, ResizeMode } from 'expo-av';
import VideoPost from '../../components/VideoPost';
import { ChatService } from '../../lib/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
// Import the renamed CreatePostScreen


const { width } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  location?: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
}

const StoriesScreen = () => {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Helper: fetch a single post with engagement counts
  const fetchPostWithCounts = async (postId: string): Promise<Post | null> => {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .eq('id', postId)
      .single();
    if (error || !post) return null;
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    return {
      ...(post as any),
      likes_count: likesCount || 0,
      comments_count: commentsCount || 0,
      profiles: (post as any).profiles || { username: 'Unknown User', avatar_url: null },
    } as Post;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log('Fetching posts...');
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url)')
          .neq('media_type', 'video')
          .is('group_id', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching posts:', error);
          ModernAlert.error('Error', 'Failed to fetch posts.');
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.log('No posts found');
          setPosts([]);
          setFilteredPosts([]);
          setLoading(false);
          return;
        }

        console.log(`Found ${data.length} posts, fetching engagement counts...`);
        
        const postsWithCounts = await Promise.all(
          data.map(async (post) => {
            try {
              const { count: likesCount, error: likesError } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              const { count: commentsCount, error: commentsError } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id);

              if (likesError) {
                console.warn('Error fetching likes for post', post.id, ':', likesError);
              }
              if (commentsError) {
                console.warn('Error fetching comments for post', post.id, ':', commentsError);
              }

              return {
                ...post,
                likes_count: likesCount || 0,
                comments_count: commentsCount || 0,
                profiles: post.profiles || { username: 'Unknown User', avatar_url: null },
              };
            } catch (postError) {
              console.error('Error processing post', post.id, ':', postError);
              return {
                ...post,
                likes_count: 0,
                comments_count: 0,
                profiles: post.profiles || { username: 'Unknown User', avatar_url: null },
              };
            }
          })
        );

        console.log(`Processed ${postsWithCounts.length} posts with engagement counts`);
        setPosts(postsWithCounts as Post[]);
        setFilteredPosts(postsWithCounts as Post[]);
        setLoading(false);
      } catch (fetchError) {
        console.error('Critical error in fetchPosts:', fetchError);
        ModernAlert.error('Error', 'Failed to load posts. Please try again.');
        setLoading(false);
      }
    };

    fetchPosts();

    const subscription = supabase
      .channel('stories-realtime')
      // New posts
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload: any) => {
          // Respect same screen filters (exclude videos, only non-group posts)
          if (payload.new?.media_type === 'video' || payload.new?.group_id) return;
          const postWithCounts = await fetchPostWithCounts(payload.new.id);
          if (postWithCounts) {
            setPosts((prev) => [postWithCounts, ...prev]);
            setFilteredPosts((prev) => [postWithCounts, ...prev]);
          }
        }
      )
      // Post updates (e.g., edited content/media)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        async (payload: any) => {
          const updated = await fetchPostWithCounts(payload.new.id);
          if (!updated) return;
          setPosts((prev) => prev.map(p => (p.id === updated.id ? updated : p)));
          setFilteredPosts((prev) => prev.map(p => (p.id === updated.id ? updated : p)));
        }
      )
      // Post deletions
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setPosts((prev) => prev.filter(p => p.id !== deletedId));
          setFilteredPosts((prev) => prev.filter(p => p.id !== deletedId));
        }
      )
      // Likes changes: keep counts in sync
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        (payload: any) => {
          const postId = payload.new?.post_id;
          if (!postId) return;
          setPosts((prev) => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
          setFilteredPosts((prev) => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes' },
        (payload: any) => {
          const postId = payload.old?.post_id;
          if (!postId) return;
          setPosts((prev) => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p));
          setFilteredPosts((prev) => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p));
        }
      )
      // Comments changes: keep counts in sync
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload: any) => {
          const postId = payload.new?.post_id;
          if (!postId) return;
          setPosts((prev) => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
          setFilteredPosts((prev) => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload: any) => {
          const postId = payload.old?.post_id;
          if (!postId) return;
          setPosts((prev) => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
          setFilteredPosts((prev) => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter(post => 
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const handleLike = (postId: string) => {
    // Mock implementation
  };

  const handleShare = (post: Post) => {
    ModernAlert.info('Share', `Share this post?`);
  };

  const handleComment = (post: Post) => {
    router.push({ pathname: '/post-details', params: { post: JSON.stringify(post) } });
  };


  const renderFeaturedContent = () => {
    console.log('renderFeaturedContent called, filteredPosts length:', filteredPosts.length);
    
    // Sort posts by engagement score (likes + comments) to determine trending content
    const trendingPosts = [...filteredPosts]
      .filter(post => {
        const hasMedia = post.media_url && post.media_url.trim() !== '';
        console.log(`Post ${post.id} has media:`, hasMedia, 'URL:', post.media_url);
        return hasMedia;
      }) // Only show posts with images for featured section
      .sort((a, b) => {
        const scoreA = (a.likes_count || 0) + (a.comments_count || 0);
        const scoreB = (b.likes_count || 0) + (b.comments_count || 0);
        return scoreB - scoreA; // Sort in descending order (highest engagement first)
      })
      .slice(0, 5); // Take top 5 trending posts

    console.log('Trending posts found:', trendingPosts.length);
    
    if (trendingPosts.length === 0) {
      console.log('No trending posts with media found, not rendering featured section');
      return null; // Don't show featured section if no posts with media
    }

    return (
      <View style={styles.featuredSection}>
        <View style={styles.featuredHeader}>
          <TrendingUp size={20} color="#8B5CF6" />
          <Text style={styles.featuredTitle}>Trending Discoveries</Text>
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingBadgeText}>🔥 Hot</Text>
          </View>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.featuredScroll}
          contentContainerStyle={styles.featuredScrollContent}
        >
          {trendingPosts.map((post, index) => {
            console.log(`Rendering trending post ${index + 1}:`, post.id, 'by', post.profiles?.username);
            return (
              <TouchableOpacity 
                key={`featured-${post.id}`} 
                style={styles.featuredCard}
                onPress={() => {
                  console.log('Trending post pressed:', post.id);
                  router.push({ pathname: '/post-details', params: { post: JSON.stringify(post) } });
                }}
                activeOpacity={0.8}
              >
                {post.media_url && (
                  <Image 
                    source={{ uri: post.media_url }} 
                    style={styles.featuredImage}
                    onError={(error) => {
                      console.error('Featured image load error for post', post.id, ':', error.nativeEvent?.error);
                    }}
                    onLoad={() => {
                      console.log('Featured image loaded successfully for post', post.id);
                    }}
                  />
                )}
                <View style={styles.featuredOverlay}>
                  <Text style={styles.featuredAuthor} numberOfLines={1}>
                    {post.profiles?.username || 'Unknown User'}
                  </Text>
                  <View style={styles.featuredStats}>
                    <Heart size={12} color="#FFFFFF" />
                    <Text style={styles.featuredStatText}>{post.likes_count || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Discover places, people, stories..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.quickFilters}
        contentContainerStyle={styles.quickFiltersContent}
      >
        <TouchableOpacity style={styles.filterChip}>
          <Compass size={16} color="#8B5CF6" />
          <Text style={styles.filterText}>Places</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Users size={16} color="#8B5CF6" />
          <Text style={styles.filterText}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <TrendingUp size={16} color="#8B5CF6" />
          <Text style={styles.filterText}>Trending</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {renderSearchBar()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!loading && renderFeaturedContent()}
        
        <View style={styles.storiesHeader}>
          <Text style={styles.sectionTitle}>Latest Stories</Text>
          <Text style={styles.sectionSubtitle}>
            {loading ? 'Loading...' : `${filteredPosts.length} discoveries`}
          </Text>
        </View>
        
        {loading ? (
          <View style={styles.contentLoadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Discovering amazing stories...</Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <TouchableOpacity key={post.id} onPress={() => router.push({ pathname: '/post-details', params: { post: JSON.stringify(post) } })}>
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image source={{ uri: post.profiles.avatar_url }} style={styles.avatar} />
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{post.profiles.username}</Text>
                  </View>
                  <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.postText}>{post.content}</Text>

                {post.location && (
                  <View style={styles.geotagContainer}>
                    <MapPin size={14} color="#8B5CF6" />
                    <Text style={styles.geotagText}>Geotagged • {post.location}</Text>
                  </View>
                )}

                {post.media_url && post.media_type === 'image' ? (
                  <Image
                    source={{ uri: post.media_url }}
                    style={styles.postImage}
                    onError={(e) => console.log('Image load error for', post.media_url, e.nativeEvent.error)}
                  />
                ) : null}

                <View style={styles.engagement}>
                  <TouchableOpacity
                    style={styles.engagementButton}
                    onPress={() => handleLike(post.id)}
                  >
                    <Heart
                      size={20}
                      color={'#9CA3AF'}
                    />
                    <Text style={styles.engagementCount}>{post.likes_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.engagementButton}
                    onPress={() => handleComment(post)}
                  >
                    <MessageCircle size={20} color="#9CA3AF" />
                    <Text style={styles.engagementCount}>{post.comments_count}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.engagementButton}
                    onPress={() => handleShare(post)}
                  >
                    <Share size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      <TouchableOpacity style={styles.floatingActionButton} onPress={() => router.push('/create-post')}>
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  )
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('Stories');
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        console.log('Fetching conversations for unread count...');
        const conversations = await ChatService.getConversations();
        console.log(`Found ${conversations.length} conversations`);
        
        let totalUnread = 0;
        
        for (const conversation of conversations) {
          try {
            const unread = await ChatService.getUnreadCount(conversation.id);
            totalUnread += unread;
            console.log(`Conversation ${conversation.id}: ${unread} unread messages`);
          } catch (convError) {
            console.error(`Error getting unread count for conversation ${conversation.id}:`, convError);
            // Continue with other conversations even if one fails
          }
        }
        
        console.log(`Total unread messages: ${totalUnread}`);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        // Set to 0 to prevent UI issues
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Subscribe to conversation updates to refresh unread count
    const subscription = ChatService.subscribeToConversations(user.id, () => {
      fetchUnreadCount();
    });

    // Also subscribe to read-status changes for this user so the badge updates immediately when messages are read
    const readStatusSub = ChatService.subscribeToReadStatus(user.id, () => {
      fetchUnreadCount();
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (readStatusSub) {
        readStatusSub.unsubscribe();
      }
    };
  }, [user]);

  const handleCreatePost = () => {
    console.log('Attempting to navigate to /create-post-screen');
    router.push('/create-post') // ✅ correct

  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.modernHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.modernTitle}>{t('community.title', 'Community')}</Text>
            <Text style={styles.modernSubtitle}>{t('community.subtitle', 'Share your discoveries')}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.modernChatButton} 
            onPress={() => router.push('/chats')}
          >
            <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.modernUnreadBadge}>
                <Text style={styles.modernUnreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount.toString()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cleanTabBar}>
          <TouchableOpacity 
            style={[styles.cleanTabItem, activeTab === 'Stories' && styles.activeCleanTab]} 
            onPress={() => setActiveTab('Stories')}
          >
            <Text style={[styles.cleanTabText, activeTab === 'Stories' && styles.activeCleanTabText]}>
              {t('community.stories', 'Stories')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cleanTabItem, activeTab === 'Groups' && styles.activeCleanTab]} 
            onPress={() => setActiveTab('Groups')}
          >
            <Text style={[styles.cleanTabText, activeTab === 'Groups' && styles.activeCleanTabText]}>
              {t('community.groups', 'Groups')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cleanTabItem, activeTab === 'Events' && styles.activeCleanTab]} 
            onPress={() => setActiveTab('Events')}
          >
            <Text style={[styles.cleanTabText, activeTab === 'Events' && styles.activeCleanTabText]}>
              {t('community.events', 'Events')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cleanTabItem, activeTab === 'Reels' && styles.activeCleanTab]} 
            onPress={() => router.push('/reels')}
          >
            <Text style={[styles.cleanTabText, activeTab === 'Reels' && styles.activeCleanTabText]}>
              {t('community.reels', 'Reels')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'Stories' && <StoriesScreen />}
        {activeTab === 'Groups' && (
          <View style={{ flex: 1 }}>
            <GroupsScreen />
            <TouchableOpacity style={styles.floatingActionButton} onPress={() => router.push('/create-group')}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'Events' && (
          <View style={{ flex: 1 }}>
            <EventsScreen />
            <TouchableOpacity style={styles.floatingActionButton} onPress={() => router.push('/create-event')}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  modernTitle: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modernSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
  },
  modernChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modernUnreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modernUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  headerContent: {
    flex: 1,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  titleContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chatButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 12,
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  modernTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 25,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    marginBottom: 16,
  },
  cleanTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  cleanTabItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCleanTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  activeCleanTabText: {
    color: '#8B5CF6',
    fontFamily: 'Inter-SemiBold',
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    flex: 1,
  },
  activeTab: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  tabText: {
    color: '#6B7280',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  modernTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 1,
  },
  activeModernTab: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modernTabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  activeModernTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  authorLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  timestamp: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  postText: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 26,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  geotagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  geotagText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    marginBottom: 20,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  locationTagText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#A78BFA',
  },
  engagement: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
    marginTop: 4,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 114, 128, 0.05)',
    flex: 1,
    justifyContent: 'center',
    maxWidth: '32%',
  },
  engagementText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  engagementCount: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  likedText: {
    color: '#EF4444',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomPadding: {
    height: 160,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  // Search and Discovery styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    minHeight: 120,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  clearButton: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  quickFilters: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  quickFiltersContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  // Featured content styles
  featuredSection: {
    marginBottom: 32,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  featuredScroll: {
    paddingLeft: 0,
  },
  featuredScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  featuredCard: {
    width: width * 0.45,
    height: 240,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    // iOS-specific improvements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredAuthor: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  // Stories section styles
  storiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Trending badge styles
  trendingBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  trendingBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  // Content loading styles
  contentLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
});
