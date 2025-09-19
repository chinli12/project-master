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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Heart, Shield, HelpCircle, LogOut, Camera, MessageSquare, UserPlus, Trophy, Edit } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photosShared, setPhotosShared] = useState<{ id: string; image: string }[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [placesVisited, setPlacesVisited] = useState<PlaceVisited[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [editableName, setEditableName] = useState('');
  const [editableBio, setEditableBio] = useState('');
  const [editableAvatar, setEditableAvatar] = useState('');
  const [editableCoverPhoto, setEditableCoverPhoto] = useState('');

  const fetchUserPosts = async () => {
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
          .eq('user_id', user.id)
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
      Alert.alert('Error', 'Failed to fetch your shared photos.');
      setPhotosShared([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      // Fetch posts count
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (postsError) throw postsError;

      const { count: followersCount, error: followersError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    if (followersError) throw followersError;

    const { count: followingCount, error: followingError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    if (followingError) throw followingError;


      setUserStats({
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error.message);
      setUserStats({
        posts: 0,
        followers: 0,
        following: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('ProfileScreen - useFocusEffect called');
      console.log('ProfileScreen - user from AuthContext:', user ? { id: user.id, email: user.email } : 'null');
      
      const fetchProfile = async () => {
        if (user) {
          console.log('ProfileScreen - Fetching profile for user ID:', user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('ProfileScreen - Error fetching profile:', error);
          }

          if (data) {
            console.log('ProfileScreen - Profile data fetched:', data);
            setProfile(data);
            setEditableName(data.full_name || '');
            setEditableBio(data.bio || '');
            setEditableAvatar(data.avatar_url || '');
            setEditableCoverPhoto(data.cover_photo_url || '');
          } else {
            console.log('ProfileScreen - No profile data found');
          }
        } else {
          console.log('ProfileScreen - No user available, skipping profile fetch');
        }
      };

      fetchProfile();
      fetchUserPosts();
      fetchUserStats();
    }, [user])
  );

  useEffect(() => {
    const fetchPlacesVisited = async () => {
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
      } catch (error: any) {
        console.error('Error fetching places visited:', error.message);
        Alert.alert('Error', 'Failed to fetch places visited.');
        setPlacesVisited([]);
      } finally {
        setPlacesLoading(false);
      }
    };

    fetchPlacesVisited();
  }, [user]);

  const handleFollow = () => {
    Alert.alert('Follow', 'You are now following Alex Thompson.');
  };

  const handleMessage = () => {
    Alert.alert('Message', 'Messaging feature will be implemented here.');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const pickImage = async (type: 'avatar' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library permissions to change your profile picture.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === 'avatar') {
        setEditableAvatar(result.assets[0].uri);
      } else {
        setEditableCoverPhoto(result.assets[0].uri);
      }
    }
  };

  const uploadImage = async (uri: string, path: string, bucket: 'avatars' | 'covers') => {
    const fileExt = uri.split('.').pop();
    const fileName = path.split('/').pop(); // Extract filename from path
    const contentType = `image/${fileExt}`;

    const { data, error } = await supabase.storage.from(bucket).upload(path, {
      uri: uri,
      type: contentType,
      name: fileName,
    } as any, {
      cacheControl: '3600',
      upsert: true,
      contentType: contentType,
    });

    if (error) {
      throw error;
    }
    return data.path;
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      let avatarUrl = editableAvatar;
      let coverPhotoUrl = editableCoverPhoto;

      // Add timestamp for cache busting
      const timestamp = Date.now();

      if (editableAvatar !== profile?.avatar_url && !editableAvatar.startsWith('http')) {
        const avatarPath = `public/${user?.id}/avatar_${timestamp}.jpg`;
        await uploadImage(editableAvatar, avatarPath, 'avatars');
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
        avatarUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
      }

      if (editableCoverPhoto !== profile?.cover_photo_url && !editableCoverPhoto.startsWith('http')) {
        const coverPath = `public/${user?.id}/cover_${timestamp}.jpg`;
        await uploadImage(editableCoverPhoto, coverPath, 'covers');
        const { data: publicUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);
        coverPhotoUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editableName,
          bio: editableBio,
          avatar_url: avatarUrl,
          cover_photo_url: coverPhotoUrl,
        })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      // Force update the state with the new URLs
      setProfile({
        ...profile,
        full_name: editableName,
        bio: editableBio,
        avatar_url: avatarUrl,
        cover_photo_url: coverPhotoUrl,
      });
      
      setEditableName(editableName);
      setEditableBio(editableBio);
      setEditableAvatar(avatarUrl);
      setEditableCoverPhoto(coverPhotoUrl);

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditableName(profile?.full_name || '');
    setEditableBio(profile?.bio || '');
    setEditableAvatar(profile?.avatar_url || '');
    setEditableCoverPhoto(profile?.cover_photo_url || '');
    setIsEditing(false);
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show sign-in prompt when user is not authenticated
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.notAuthenticatedContainer}>
            <User size={64} color="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
            <Text style={styles.notAuthenticatedTitle}>Sign In Required</Text>
            <Text style={styles.notAuthenticatedSubtitle}>
              Please sign in to view and edit your profile
            </Text>
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => router.push('/signin' as any)}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>Profile</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <LogOut size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image 
              source={{ 
                uri: editableCoverPhoto || 'https://via.placeholder.com/400x240/8B5CF6/FFFFFF?text=Cover+Photo' 
              }} 
              style={styles.coverPhoto} 
              key={editableCoverPhoto} // Force re-render when URI changes
            />
            {isEditing && (
              <TouchableOpacity style={styles.editCoverButton} onPress={() => pickImage('cover')}>
                <Camera size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <View style={styles.avatarContainer}>
              <Image 
                source={{ 
                  uri: editableAvatar || 'https://via.placeholder.com/180x180/8B5CF6/FFFFFF?text=Avatar' 
                }} 
                style={styles.avatar} 
                key={editableAvatar} // Force re-render when URI changes
              />
              {isEditing && (
                <TouchableOpacity style={styles.cameraButton} onPress={() => pickImage('avatar')}>
                  <Camera size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.userInfoContainer}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.userNameInput}
                  value={editableName}
                  onChangeText={setEditableName}
                  placeholder="Your Name"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <TextInput
                  style={styles.userBioInput}
                  value={editableBio}
                  onChangeText={setEditableBio}
                  placeholder="Your Bio"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={styles.userName}>{editableName}</Text>
                <Text style={styles.userBio}>{editableBio}</Text>
              </>
            )}
          </View>

          {isEditing ? (
            <View style={styles.profileActions}>
              {isEditing ? (
                <>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Save</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} disabled={loading}>
                    <Text style={[styles.actionButtonText, { color: '#E5E7EB' }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                  <Edit size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Edit size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={styles.statNumber}>{userStats.posts}</Text>
              )}
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={styles.statNumber}>{userStats.followers}</Text>
              )}
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Text style={styles.statNumber}>{userStats.following}</Text>
              )}
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Places Visited</Text>
            {placesLoading ? (
              <ActivityIndicator size="large" color="#A78BFA" />
            ) : placesVisited.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {placesVisited.map(place => (
                  <View key={place.id} style={styles.placeCard}>
                    <Image source={place.image_url ? { uri: place.image_url } : PLACEHOLDER_IMAGE_URL} style={styles.placeImage} />
                    <Text style={styles.placeName}>{place.name}</Text>
                  </View>
                ))}
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
                {photosShared.map(photo => (
                  <Image key={photo.id} source={{ uri: photo.image }} style={styles.photo} />
                ))}
              </View>
            ) : (
              <Text style={styles.noPhotosText}>No photos shared yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            {!isEditing && (
              <TouchableOpacity style={styles.settingButton} onPress={() => setIsEditing(true)}>
                <Edit size={24} color="#A78BFA" strokeWidth={2.5} />
                <Text style={styles.settingLabel}>Edit Profile</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/chats')}>
              <MessageSquare size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/badges')}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' }} style={styles.badgeIcon} />
              <Text style={styles.settingLabel}>Badges</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/leaderboard')}>
              <Trophy size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/achievements')}>
              <Shield size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Achievements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/saved-places' as any)}>
              <Heart size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Saved Places</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton} onPress={() => router.push('/privacy-settings' as any)}>
              <Settings size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Settings & Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton}>
              <HelpCircle size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Help & Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  topHeaderTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  header: {
    backgroundColor: 'transparent',
  },
  coverPhoto: {
    width: '100%',
    height: 240,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -90,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 12,
    right: 100,
    backgroundColor: '#8B5CF6',
    borderRadius: 28,
    padding: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editCoverButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
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
  userNameInput: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
    paddingVertical: 5,
    width: '80%',
    textAlign: 'center',
  },
  userBio: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  userBioInput: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
    paddingVertical: 5,
    width: '90%',
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    gap: 12,
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    marginHorizontal: 24,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
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
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  placeCard: {
    marginRight: 20,
    width: 180,
  },
  placeImage: {
    width: 180,
    height: 140,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeName: {
    marginTop: 16,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photo: {
    width: (width - 120) / 2,
    height: (width - 120) / 2,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  settingLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginLeft: 20,
    letterSpacing: 0.2,
  },
  badgeIcon: {
    width: 24,
    height: 24,
  },
  noPhotosText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  // Loading and authentication states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  notAuthenticatedTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  notAuthenticatedSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#8B5CF6',
    textAlign: 'center',
  },
});
