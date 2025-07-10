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
import { User, Settings, Heart, Shield, CircleHelp as HelpCircle, LogOut, Camera, MessageSquare, UserPlus, Trophy, Edit } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

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

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photosShared, setPhotosShared] = useState<{ id: string; image: string }[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [placesVisited, setPlacesVisited] = useState<PlaceVisited[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);

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

  useFocusEffect(
    React.useCallback(() => {
      const fetchProfile = async () => {
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setProfile(data);
            setEditableName(data.full_name || '');
            setEditableBio(data.bio || '');
            setEditableAvatar(data.avatar_url || '');
            setEditableCoverPhoto(data.cover_photo_url || '');
          }
        }
      };

      fetchProfile();
      fetchUserPosts();
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

      if (editableAvatar !== profile?.avatar_url && !editableAvatar.startsWith('http')) {
        const avatarPath = `public/${user?.id}/avatar.jpg`;
        await uploadImage(editableAvatar, avatarPath, 'avatars');
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
        avatarUrl = publicUrlData.publicUrl;
      }

      if (editableCoverPhoto !== profile?.cover_photo_url && !editableCoverPhoto.startsWith('http')) {
        const coverPath = `public/${user?.id}/cover.jpg`;
        await uploadImage(editableCoverPhoto, coverPath, 'covers');
        const { data: publicUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);
        coverPhotoUrl = publicUrlData.publicUrl;
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topHeader}>
          <Text style={styles.topHeaderTitle}>Profile</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <LogOut size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image source={{ uri: editableCoverPhoto }} style={styles.coverPhoto} />
            {isEditing && (
              <TouchableOpacity style={styles.editCoverButton} onPress={() => pickImage('cover')}>
                <Camera size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <View style={styles.avatarContainer}>
              <Image source={{ uri: editableAvatar }} style={styles.avatar} />
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
              <Text style={styles.statNumber}>{mockUserStats.friends}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mockUserStats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mockUserStats.following}</Text>
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
            <TouchableOpacity style={styles.settingButton}>
              <Heart size={24} color="#A78BFA" strokeWidth={2.5} />
              <Text style={styles.settingLabel}>Saved Places</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingButton}>
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
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  header: {
    backgroundColor: 'transparent',
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
    borderColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 115,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userNameInput: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#A78BFA',
    paddingVertical: 5,
    width: '80%',
    textAlign: 'center',
  },
  userBio: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  userBioInput: {
    fontSize: 17,
    fontFamily: 'Inter-Light',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A78BFA',
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
    backgroundColor: '#374151',
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
    backgroundColor: '#4F46E5',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#EF4444',
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
    backgroundColor: '#1F2937',
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
    color: '#F9FAFB',
  },
  statLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#1F2937',
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
    color: '#F9FAFB',
    marginBottom: 16,
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
    color: '#D1D5DB',
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
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
    marginLeft: 20,
  },
  badgeIcon: {
    width: 24,
    height: 24,
  },
  noPhotosText: {
    color: '#D1D5DB',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginTop: 10,
  },
});
