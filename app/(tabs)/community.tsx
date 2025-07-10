import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Heart, MessageCircle, Share, Camera, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import GroupsScreen from '../groups';
import EventsScreen from '../events';
import { supabase } from '../../lib/supabase';
import { Video, ResizeMode } from 'expo-av';
import VideoPost from '../../components/VideoPost';
// Import the renamed CreatePostScreen


const { width } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
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

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .neq('media_type', 'video')
        .is('group_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        Alert.alert('Error', 'Failed to fetch posts.');
        setLoading(false);
        return;
      }
      
      const postsWithCounts = await Promise.all(
        data.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
          };
        })
      );

      setPosts(postsWithCounts as Post[]);
      setLoading(false);
    };

    fetchPosts();

    const subscription = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const { data: newPost, error } = await supabase
            .from('posts')
            .select('*, profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          
          if (newPost) {
            setPosts((prevPosts) => [newPost as Post, ...prevPosts]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLike = (postId: string) => {
    // Mock implementation
  };

  const handleShare = (post: Post) => {
    Alert.alert('Share', `Share this post?`);
  };

  const handleComment = (post: Post) => {
    router.push({ pathname: '/post-details', params: { post: JSON.stringify(post) } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
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

              {post.media_url && post.media_type === 'image' ? (
                <Image
                  source={{ uri: post.media_url }}
                  style={styles.postImage}
                  onError={(e) => console.log('Image load error for ' + post.media_url, e.nativeEvent.error)}
                />
              ) : null}

              <View style={styles.engagement}>
                <TouchableOpacity
                  style={styles.engagementButton}
                  onPress={() => handleLike(post.id)}
                >
                  <Heart
                    size={18}
                    color={'#9CA3AF'}
                  />
                  <Text style={styles.engagementText}>{post.likes_count} Likes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.engagementButton}
                  onPress={() => handleComment(post)}
                >
                  <MessageCircle size={18} color="#9CA3AF" />
                  <Text style={styles.engagementText}>{post.comments_count} Comments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.engagementButton}
                  onPress={() => handleShare(post)}
                >
                  <Share size={18} color="#9CA3AF" />
                  <Text style={styles.engagementText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
  const router = useRouter();

  const handleCreatePost = () => {
    console.log('Attempting to navigate to /create-post-screen');
    router.push('/create-post') // ✅ correct


  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Share your discoveries</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Stories' && styles.activeTab]} onPress={() => setActiveTab('Stories')}>
            <Text style={[styles.tabText, activeTab === 'Stories' && styles.activeTabText]}>Stories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Groups' && styles.activeTab]} onPress={() => setActiveTab('Groups')}>
            <Text style={[styles.tabText, activeTab === 'Groups' && styles.activeTabText]}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Events' && styles.activeTab]} onPress={() => setActiveTab('Events')}>
            <Text style={[styles.tabText, activeTab === 'Events' && styles.activeTabText]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Reels' && styles.activeTab]} onPress={() => router.push('/reels')}>
            <Text style={[styles.tabText, activeTab === 'Reels' && styles.activeTabText]}>Reels</Text>
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
        {activeTab === 'Events' && <EventsScreen />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  postCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
  },
  authorLocation: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  timestamp: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  postText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
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
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engagementText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  likedText: {
    color: '#F87171',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  bottomPadding: {
    height: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
