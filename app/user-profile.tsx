import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { ModernAlert } from '@/utils/modernAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, UserPlus, ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ImageCarousel from '@/components/ImageCarousel';

const { width } = Dimensions.get('window');

interface UserStats {
  friends: number;
  followers: number;
  following: number;
}

const mockUserStats: UserStats = {
  friends: 256,
  followers: 1024,
  following: 345,
};

const mockPlacesVisited = [
  { id: '1', name: 'Historic Cathedral Square', image: 'https://images.pexels.com/photos/161841/prague-cathedral-architecture-building-161841.jpeg' },
  { id: '2', name: 'Old Market Heritage Trail', image: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg' },
  { id: '3', name: 'Riverside Memorial Garden', image: 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg' },
];

interface PlaceVisited {
  id: string;
  name: string;
  image_url: string;
}

const PLACEHOLDER_IMAGE_URL = require('@/assets/images/noplaceimage.png');

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [photosShared, setPhotosShared] = useState<{ id: string; image: string }[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [placesVisited, setPlacesVisited] = useState<PlaceVisited[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);

  // Effect to set user data from params or fetch from DB
  useEffect(() => {
    const fetchUser = async () => {
      let userId = params.userId;
      if (params.user) {
        try {
          const userData = JSON.parse(params.user as string);
          userId = userData.id;
        } catch (error) {
          console.error('Error parsing user data:', error);
          ModernAlert.error('Error', 'Failed to load user profile');
          return;
        }
      }

      if (userId) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileError) throw profileError;

          let finalAvatarUrl = profileData.avatar_url;
          if (finalAvatarUrl && !finalAvatarUrl.startsWith('http')) {
            const { data: avatar } = supabase.storage.from('avatars').getPublicUrl(finalAvatarUrl);
            finalAvatarUrl = avatar.publicUrl;
          }

          let finalCoverPhotoUrl = profileData.cover_photo_url;
          if (finalCoverPhotoUrl && !finalCoverPhotoUrl.startsWith('http')) {
            const { data: cover } = supabase.storage.from('covers').getPublicUrl(finalCoverPhotoUrl);
            finalCoverPhotoUrl = cover.publicUrl;
          }
          
          setUser({
            id: userId,
            ...profileData,
            full_name: profileData.full_name || profileData.username,
            avatar_url: finalAvatarUrl,
            cover_photo_url: finalCoverPhotoUrl,
            bio: profileData.bio || 'No bio available'
          });
        } catch (error) {
          console.error('Error fetching user from DB:', error);
          ModernAlert.error('Error', 'Failed to load user profile from database');
        }
      }
    };

    fetchUser();
  }, [params.user, params.userId]);

  // Memoized function to check follow status
  const checkFollowStatus = useCallback(async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser || !user || authUser.id === user.id) {
      setIsFollowing(false);
      return;
    }

    console.log('Checking follow status for:', { authUserId: authUser.id, targetUserId: user.id });

    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', authUser.id)
      .eq('following_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking follow status:', error);
    }

    const following = !!data;
    console.log('Follow status result:', { following, data });
    setIsFollowing(following);
  }, [user]); // Depends on 'user' state

  // Memoized function to fetch follow counts
  const fetchFollowCounts = useCallback(async () => {
    if (!user) return;

    const { count: followersCount, error: followersError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    if (!followersError && followersCount !== null) {
      setFollowersCount(followersCount);
    }

    const { count: followingCount, error: followingError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    if (!followingError && followingCount !== null) {
      setFollowingCount(followingCount);
    }
  }, [user]); // Depends on 'user' state

  // Memoized function to fetch places visited
  const fetchPlacesVisited = useCallback(async () => {
    if (!user) {
      setPlacesVisited([]);
      setPlacesLoading(false);
      return;
    }

    setPlacesLoading(true);
    try {
      const { data, error } = await supabase
        .from('places_visited')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false });

      if (error) {
        throw error;
      }

        setPlacesVisited(data as PlaceVisited[]);
        console.log('Fetched places visited:', data); // Debug log
      } catch (error: any) {
        console.error('Error fetching places visited:', error.message);
        ModernAlert.error('Error', 'Failed to fetch places visited.');
        setPlacesVisited([]);
      } finally {
        setPlacesLoading(false);
      }
    }, [user]); // Depends on 'user' state

  // Memoized function to fetch user posts
  const fetchUserPosts = useCallback(async () => {
    if (!user) {
      setPhotosShared([]);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, media_url, media_type')
        .eq('user_id', user.id) // Use user.id directly
        .not('media_url', 'is', null)
        .in('media_type', ['image']);

      if (error) {
        throw error;
      }

      const fetchedPhotos = data
        .filter(post => post.media_url && post.media_type === 'image')
        .map(post => ({
          id: post.id,
          image: post.media_url!,
        }));

      setPhotosShared(fetchedPhotos);
    } catch (error: any) {
      console.error('Error fetching user posts:', error.message);
      ModernAlert.error('Error', 'Failed to fetch user photos.');
      setPhotosShared([]);
    } finally {
      setPostsLoading(false);
    }
  }, [user]); // Depends on 'user' state

  // Effect to call all fetch functions when user data is available
  useEffect(() => {
    if (user) {
      checkFollowStatus();
      fetchFollowCounts();
      fetchPlacesVisited();
      fetchUserPosts();
    }
  }, [user, checkFollowStatus, fetchFollowCounts, fetchPlacesVisited, fetchUserPosts]);

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  const handleFollow = async () => {
   // console.log('Follow button pressed'); // Debug log
    //console.log('Current user state:', user);
    //console.log('Current auth user:', currentUser);
    
    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabase
        .from('followers')
        .select('count', { count: 'exact', head: true });
      
      console.log('Database test result:', { testData, testError });
      
      if (testError) {
        console.error('Database connection test failed:', testError);
        ModernAlert.error('Error', `Database connection failed: ${testError.message}`);
        return;
      }
    } catch (dbError) {
      console.error('Database test exception:', dbError);
      ModernAlert.error('Error', 'Cannot connect to database');
      return;
    }
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      ModernAlert.error('Error', 'Authentication failed');
      return;
    }
    
    if (!authUser) {
      ModernAlert.error('Error', 'You need to be logged in to follow users');
      return;
    }

    if (!user) {
      console.error('Target user is null/undefined:', user);
      ModernAlert.error('Error', 'User profile not loaded properly');
      return;
    }

    if (!user.id) {
      console.error('Target user ID is missing:', user);
      ModernAlert.error('Error', 'User ID is missing');
      return;
    }

    if (authUser.id === user.id) {
      ModernAlert.error('Error', 'You cannot follow yourself.');
      return;
    }

   
    setFollowLoading(true);
    try {
      if (isFollowing) {
        console.log('Unfollowing user...');
        const { error, count } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', authUser.id)
          .eq('following_id', user.id);

        if (error) {
          console.error('Unfollow error:', error);
          throw error;
        }

        console.log('Unfollow successful, deleted rows:', count);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        ModernAlert.success('Success', 'You are no longer following this user');
      } else {
        console.log('Following user...');
        console.log('Insert data:', {
          follower_id: authUser.id,
          following_id: user.id
        });
        
        // First test if we can even select from the table
        console.log('Testing table access...');
        const { data: testSelect, error: selectError } = await supabase
          .from('followers')
          .select('*')
          .limit(1);
        
        console.log('Table select test:', { testSelect, selectError });
        
        if (selectError) {
          console.error('Cannot access followers table:', selectError);
          throw new Error(`Table access denied: ${selectError.message || 'Unknown error'}`);
        }
        
        console.log('Attempting insert...');
        const insertResult = await supabase
          .from('followers')
          .insert({
            follower_id: authUser.id,
            following_id: user.id
          })
          .select();

        console.log('Full insert result:', insertResult);
        const { error, data } = insertResult;

        if (error) {
          console.error('Follow error:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        console.log('Follow successful, inserted:', data);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        ModernAlert.success('Success', 'You are now following this user');
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      ModernAlert.error('Error', `Failed to ${isFollowing ? 'unfollow' : 'follow'} user: ${errorMessage}`);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }


  const handleMessage = async () => {
    if (!user || !currentUser) {
      ModernAlert.error('Error', 'Unable to start chat');
      return;
    }

    setMessageLoading(true);
    try {
      // Import ChatService
      const { ChatService } = await import('@/lib/chatService');
      
      // Create or get conversation
      const conversationId = await ChatService.getOrCreateConversation(user.id);
      
      // Navigate to chat
      router.push({
        pathname: '/chat/[id]',
        params: { id: conversationId }
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      ModernAlert.error('Error', 'Failed to start chat');
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>{user.full_name}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.coverPhotoContainer}>
            <Image source={user.cover_photo_url ? { uri: user.cover_photo_url } : PLACEHOLDER_IMAGE_URL} style={styles.coverPhoto} />
            <View style={styles.avatarContainer}>
              <Image source={user.avatar_url ? { uri: user.avatar_url } : PLACEHOLDER_IMAGE_URL} style={styles.avatar} />
            </View>
          </View>

          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{user.full_name}</Text>
            <Text style={styles.userBio}>{user.bio || 'No bio available'}</Text>
          </View>

          {user && currentUser && user.id !== currentUser.id && (
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={[styles.followButton, isFollowing && { backgroundColor: '#4F46E5' }]} 
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {isFollowing ? (
                      <UserPlus size={20} color="#FFFFFF" strokeWidth={2.5} />
                    ) : (
                      <UserPlus size={20} color="#E5E7EB" strokeWidth={2.5} />
                    )}
                    <Text style={[styles.actionButtonText, { color: isFollowing ? '#FFFFFF' : '#E5E7EB' }]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.messageButton} 
                onPress={handleMessage}
                disabled={messageLoading}
              >
                {messageLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{photosShared.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Places Visited</Text>
            {placesLoading ? (
              <ActivityIndicator size="large" color="#A78BFA" />
            ) : placesVisited.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {placesVisited.map(place => {
                  //console.log('Place image URL:', place.image_url); // Debug log
                  return (
                    <View key={place.id} style={styles.placeCard}>
                  <Image source={place.image_url ? { uri: place.image_url } : PLACEHOLDER_IMAGE_URL} style={styles.placeImage} />
                      <Text style={styles.placeName}>{place.name}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.noPhotosText}>No places visited yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos Shared</Text>
            {postsLoading ? (
              <ActivityIndicator size="large" color="#A78BFA" />
            ) : photosShared.length > 0 ? (
              <View style={styles.photoGrid}>
                {photosShared.map((photo, index) => (
                  <TouchableOpacity 
                    key={photo.id} 
                    onPress={() => {
                      setSelectedImageIndex(index);
                      setCarouselVisible(true);
                    }}
                  >
                    <Image source={{ uri: photo.image }} style={styles.photo} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noPhotosText}>No photos shared yet.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ImageCarousel
        images={photosShared}
        visible={carouselVisible}
        initialIndex={selectedImageIndex}
        onClose={() => setCarouselVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginLeft: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  coverPhotoContainer: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 220,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -80,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  userInfoContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
  },
  userBio: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    gap: 16,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photo: {
    width: (width - 100) / 2,
    height: (width - 100) / 2,
    borderRadius: 12,
    marginBottom: 12,
  },
  noPhotosText: {
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginTop: 10,
  },
  placeCard: {
    marginRight: 16,
    width: 160,
  },
  placeImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
  },
  placeName: {
    marginTop: 12,
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#1F2937',
  },
});
