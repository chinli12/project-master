import React, { useState, useEffect, useCallback } from 'react';
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
          Alert.alert('Error', 'Failed to load user profile');
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
          Alert.alert('Error', 'Failed to load user profile from database');
        }
      }
    };

    fetchUser();
  }, [params.user, params.userId]);

  // Memoized function to check follow status
  const checkFollowStatus = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !user || authUser.id === user.id) {
      setIsFollowing(false);
      return;
    }

    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', authUser.id)
      .eq('following_id', user.id)
      .single();

    if (data) {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
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
        Alert.alert('Error', 'Failed to fetch places visited.');
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
      Alert.alert('Error', 'Failed to fetch user photos.');
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      Alert.alert('Error', 'You need to be logged in to follow users');
      return;
    }

    if (!user || authUser.id === user.id) {
      Alert.alert('Error', 'You cannot follow yourself or an invalid user.');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', authUser.id) // Use authUser.id
          .eq('following_id', user.id); // Use user.id

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: authUser.id, // Use authUser.id
            following_id: user.id // Use user.id
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      Alert.alert('Error', 'Failed to follow/unfollow user');
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


  const handleMessage = () => {
    Alert.alert('Message', 'Messaging feature will be implemented here.');
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
            <ChevronLeft size={28} color="#FFFFFF" />
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
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <MessageSquare size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Message</Text>
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
                  console.log('Place image URL:', place.image_url); // Debug log
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginLeft: 16,
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
