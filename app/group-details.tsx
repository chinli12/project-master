import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Video, ResizeMode } from 'expo-av';
import { 
  ChevronLeft, 
  UserPlus, 
  MoreHorizontal, 
  Users, 
  Globe, 
  Lock, 
  Bell,
  Settings,
  Search,
  Pin,
  Camera,
  Heart,
  MessageCircle,
  Share,
  UserCheck,
  UserX,
  Shield,
  Flag,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Info,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  location?: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

interface Member {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function GroupDetailsScreen() {
  const { group: groupString } = useLocalSearchParams();
  const group = JSON.parse(groupString as string);
  const router = useRouter();
  
  // State management
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'discussion' | 'members' | 'media'>('discussion');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>('');
  const [mediaPosts, setMediaPosts] = useState<Post[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);
  
  // Enhanced post creation state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedPostLocation, setSelectedPostLocation] = useState<string>('');
  const [showPostDetails, setShowPostDetails] = useState<Post | null>(null);
  
  // Location state
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [group.id]);

  const fetchGroupDetails = async () => {
    try {
      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false });
      if (postsData) setPosts(postsData as Post[]);

      // Try different query approaches to get members with profiles
      console.log('Attempting to fetch members with profiles...');
      
      // First try: Left join to get all members, even those without profiles
      let { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          created_at,
          profiles!left(username, avatar_url)
        `)
        .eq('group_id', group.id)
        .order('created_at', { ascending: false });
      
      console.log('Left join result:', { membersData, membersError });
      
      // If left join fails, try basic query then manually fetch profiles
      if (membersError || !membersData) {
        console.log('Left join failed, trying manual profile fetching...');
        
        const { data: basicMembersData, error: basicError } = await supabase
          .from('group_members')
          .select('id, user_id, created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false });
        
        console.log('Basic members query result:', { basicMembersData, basicError });
        
        if (basicMembersData && basicMembersData.length > 0) {
          // Manually fetch profiles for each member
          const userIds = basicMembersData.map(member => member.user_id);
          console.log('Fetching profiles for user IDs:', userIds);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);
          
          console.log('Profiles query result:', { profilesData, profilesError });
          
          // Combine member data with profile data
          membersData = basicMembersData.map((member: any) => {
            const profile = profilesData?.find((p: any) => p.id === member.user_id);
            return {
              ...member,
              profiles: profile ? {
                username: profile.username || `User ${member.user_id.slice(-4)}`,
                avatar_url: profile.avatar_url || 'https://via.placeholder.com/40'
              } : {
                username: `User ${member.user_id.slice(-4)}`,
                avatar_url: 'https://via.placeholder.com/40'
              }
            };
          }) as any;
          
          console.log('Combined members data:', membersData);
          membersError = null;
        } else {
          membersError = basicError;
          membersData = [];
        }
      }
      
      console.log('Fetching members for group:', group.id);
      console.log('Members data:', membersData);
      console.log('Members error:', membersError);
      
      if (membersData) {
        console.log('Raw members data structure:', JSON.stringify(membersData, null, 2));
        membersData.forEach((member, index) => {
          console.log(`Member ${index}:`, {
            id: member.id,
            user_id: member.user_id,
            profiles: member.profiles
          });
        });
        setMembers(membersData as any);
        console.log('Set members:', membersData.length, 'members');
      } else {
        console.log('No members data received');
        setMembers([]);
      }

      // Check current user membership
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .single();
        if (memberData) {
          setIsMember(true);
          setUserRole('member'); // Default role since role column doesn't exist
        }
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const handleJoinGroup = async () => {
    console.log('Join group clicked');
    setLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        Alert.alert('Error', 'Authentication failed. Please try logging in again.');
        return;
      }
      
      if (!user) {
        console.log('No user found');
        Alert.alert('Error', 'You must be logged in to join a group.');
        return;
      }

      console.log('User ID:', user.id);
      console.log('Group ID:', group.id);
      console.log('Current member status:', isMember);

      if (isMember) {
        // Leave group
        console.log('Attempting to leave group...');
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Leave group error:', error);
          Alert.alert('Error', `Failed to leave group: ${error.message}`);
          return;
        }
        
        console.log('Successfully left group');
        setIsMember(false);
        setUserRole(null);
        Alert.alert('Success', 'You have left the group.');
        await fetchGroupDetails();
        
      } else {
        // Join group
        console.log('Attempting to join group...');
        const { error } = await supabase
          .from('group_members')
          .insert({ 
            group_id: group.id, 
            user_id: user.id
          });
          
        if (error) {
          console.error('Join group error:', error);
          Alert.alert('Error', `Failed to join group: ${error.message}`);
          return;
        }
        
        console.log('Successfully joined group');
        setIsMember(true);
        setUserRole('member');
        
        // Check if user has a profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('User profile check:', profileData, profileError);
        console.log('Current user data:', user);
        
        if (!profileData) {
          console.log('User has no profile, creating basic one...');
          
          // Get username from user metadata or email for new profiles only
          let username = 'Unknown User';
          if (user.user_metadata?.full_name) {
            username = user.user_metadata.full_name;
          } else if (user.email) {
            username = user.email.split('@')[0];
          } else {
            username = `User${user.id.slice(-4)}`;
          }
          
          // Create a basic profile for the user
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: username,
              avatar_url: user.user_metadata?.avatar_url || 'https://via.placeholder.com/40'
            });
          
          if (createProfileError) {
            console.error('Error creating profile:', createProfileError);
          } else {
            console.log('Profile created successfully with username:', username);
          }
        } else {
          console.log('User already has profile with username:', profileData.username);
          console.log('Using existing profile data - no updates needed');
        }
        
        Alert.alert('Success', 'You have joined the group!');
        await fetchGroupDetails();
      }
      
    } catch (error) {
      console.error('Unexpected error in handleJoinGroup:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async () => {
    if (!newPostContent.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to post.');
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          group_id: group.id,
          user_id: user.id,
          content: newPostContent,
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setPosts([data as Post, ...posts]);
        setNewPostContent('');
        Alert.alert('Success', 'Post added successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Toggle like functionality would go here
      // For now, just update the UI optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: !post.is_liked,
                likes_count: post.is_liked 
                  ? (post.likes_count || 0) - 1 
                  : (post.likes_count || 0) + 1
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleToggleNotifications = async () => {
    setNotifications(!notifications);
    Alert.alert(
      'Notifications', 
      `Group notifications ${!notifications ? 'enabled' : 'disabled'}.`
    );
  };

  const handleLeaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', group.id)
                .eq('user_id', user.id);

              if (!error) {
                setIsMember(false);
                setUserRole(null);
                setShowSettingsModal(false);
                fetchGroupDetails();
                Alert.alert('Success', 'You have left the group.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportGroup = () => {
    Alert.alert(
      'Report Group',
      'Are you sure you want to report this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
            setShowSettingsModal(false);
          }
        }
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (userRole !== 'admin') return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', group.id)
                .eq('user_id', memberId);

              if (!error) {
                fetchGroupDetails();
                Alert.alert('Success', `${memberName} has been removed from the group.`);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Location Functions
  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to check in to your current location.'
        );
        return null;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation(location);

      // Reverse geocode to get readable address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        let locationString = '';
        
        // Build location string like "Miami Beach, FL" or "Times Square, New York, NY"
        if (place.name) {
          locationString += place.name;
        } else if (place.street) {
          locationString += place.street;
        }
        
        if (place.city) {
          locationString += locationString ? `, ${place.city}` : place.city;
        }
        
        if (place.region) {
          locationString += locationString ? `, ${place.region}` : place.region;
        }

        // Fallback if no detailed info
        if (!locationString && place.district) {
          locationString = place.district;
        }
        
        if (!locationString) {
          locationString = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
        }

        setLocationName(locationString);
        setSelectedPostLocation(locationString);
        
        return locationString;
      } else {
        // Fallback to coordinates
        const coords = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
        setLocationName(coords);
        setSelectedPostLocation(coords);
        return coords;
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your location. Please try again or enter location manually.'
      );
      return null;
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCheckIn = async () => {
    const location = await getCurrentLocation();
    if (location) {
      Alert.alert(
        'Location Added',
        `Checked in at: ${location}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Enhanced Post Functions
  const handlePickMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image'
      });
      setShowCreatePostModal(true);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'Permission to access camera is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: 'image'
      });
      setShowCreatePostModal(true);
    }
  };

  const uploadMediaToSupabase = async (uri: string, type: 'image' | 'video') => {
    try {
      setUploadingMedia(true);
      
      // Create FormData for React Native file upload
      const formData = new FormData();
      const fileExtension = type === 'image' ? 'jpg' : 'mp4';
      const fileName = `${Date.now()}.${fileExtension}`;
      const filePath = `group-${group.id}/${fileName}`;

      // For React Native, we need to handle file upload differently
      formData.append('file', {
        uri: uri,
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: fileName,
      } as any);

      // Alternative approach: Try using ArrayBuffer for better compatibility
      let fileData;
      try {
        const response = await fetch(uri);
        fileData = await response.arrayBuffer();
      } catch (fetchError) {
        console.error('Error reading file:', fetchError);
        throw new Error('Failed to read selected media file');
      }

      const { data, error } = await supabase.storage
        .from('posts-media')
        .upload(filePath, fileData, {
          contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('posts-media')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Media upload error:', error);
      // Provide more specific error messages
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload media. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreatePostWithMedia = async () => {
    if (!newPostContent.trim() && !selectedMedia) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to post.');
        return;
      }

      let mediaUrl = null;
      let mediaType = null;

      // Handle media upload with graceful fallback
      if (selectedMedia) {
        try {
          mediaUrl = await uploadMediaToSupabase(selectedMedia.uri, selectedMedia.type);
          mediaType = selectedMedia.type;
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          
          // Ask user if they want to post without media
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Media Upload Failed',
              'Failed to upload media. Would you like to post without media?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Post Anyway', onPress: () => resolve(true) }
              ]
            );
          });

          if (!shouldContinue) {
            return;
          }
          
          // Clear media selection but continue with text post
          setSelectedMedia(null);
        }
      }

      // Create the post
      const { data, error } = await supabase
        .from('posts')
        .insert({
          group_id: group.id,
          user_id: user.id,
          content: newPostContent,
          media_url: mediaUrl,
          media_type: mediaType,
          location: selectedPostLocation || null,
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) {
        console.error('Post creation error:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      if (data) {
        setPosts([data as Post, ...posts]);
        setNewPostContent('');
        setSelectedMedia(null);
        setSelectedPostLocation('');
        setShowCreatePostModal(false);
        
        const successMessage = mediaUrl ? 'Post created successfully!' : 'Post created successfully (without media)!';
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error('Create post error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPost = (post: Post) => {
    router.push({ pathname: '/post-details', params: { post: JSON.stringify(post) } });
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter(p => p.id !== postId));
              Alert.alert('Success', 'Post deleted successfully.');
            } catch (error) {
              console.error('Delete post error:', error);
              Alert.alert('Error', 'Failed to delete post.');
            }
          },
        },
      ]
    );
  };

  const renderGroupHeader = () => (
    <View style={styles.headerContainer}>
      {/* Cover Photo */}
      <View style={styles.coverPhotoContainer}>
        <Image
          source={{ uri: group.image_url || `https://picsum.photos/seed/${group.id}/400/200` }}
          style={styles.coverPhoto}
        />
        <TouchableOpacity style={styles.changeCoverButton}>
          <Camera size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Group Info */}
      <View style={styles.groupInfoContainer}>
        <View style={styles.groupTitleRow}>
          <View style={styles.groupTitleContainer}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.groupMetaRow}>
              {group.privacy === 'private' ? (
                <Lock size={14} color="#9CA3AF" />
              ) : (
                <Globe size={14} color="#9CA3AF" />
              )}
              <Text style={styles.groupPrivacy}>
                {group.privacy === 'private' ? 'Private group' : 'Public group'}
              </Text>
              <Text style={styles.memberCount}>• {members.length} members</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MoreHorizontal size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, loading && styles.disabledButton]} 
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.primaryButtonText}>Loading...</Text>
            ) : (
              <>
                {isMember ? <UserCheck size={18} color="#FFFFFF" /> : <UserPlus size={18} color="#FFFFFF" />}
                <Text style={styles.primaryButtonText}>
                  {isMember ? 'Joined' : 'Join group'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Bell size={18} color="#A78BFA" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setShowSettingsModal(true)}
          >
            <Settings size={18} color="#A78BFA" />
          </TouchableOpacity>
        </View>

        {/* Group Description and Info */}
        <View style={styles.groupDetailsContainer}>
          {group.description && (
            <View style={styles.expandableSection}>
              <Text style={styles.groupDescription} numberOfLines={isDescriptionExpanded ? undefined : 3}>
                {group.description}
              </Text>
              {group.description.length > 100 && (
                <TouchableOpacity style={styles.readMoreButton} onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                  <Text style={styles.readMoreText}>{isDescriptionExpanded ? 'Show less' : 'Show more'}</Text>
                  {isDescriptionExpanded ? <ChevronUp size={16} color="#A78BFA" /> : <ChevronDown size={16} color="#A78BFA" />}
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.groupMetaDetails}>
            {group.category && (
              <View style={styles.metaDetailItem}>
                <Tag size={16} color="#9CA3AF" />
                <Text style={styles.metaDetailText}>{group.category}</Text>
              </View>
            )}
            {group.location && (
              <View style={styles.metaDetailItem}>
                <MapPin size={16} color="#9CA3AF" />
                <Text style={styles.metaDetailText}>{group.location}</Text>
              </View>
            )}
          </View>
          {group.rules && (
            <View style={styles.expandableSection}>
              <Text style={styles.groupRulesTitle}>Group Rules</Text>
              <Text style={styles.groupDescription} numberOfLines={isRulesExpanded ? undefined : 3}>
                {group.rules}
              </Text>
              {group.rules.length > 100 && (
                <TouchableOpacity style={styles.readMoreButton} onPress={() => setIsRulesExpanded(!isRulesExpanded)}>
                  <Text style={styles.readMoreText}>{isRulesExpanded ? 'Show less' : 'Show more'}</Text>
                  {isRulesExpanded ? <ChevronUp size={16} color="#A78BFA" /> : <ChevronDown size={16} color="#A78BFA" />}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {[
            { key: 'discussion', label: 'Discussion', icon: MessageCircle },
            { key: 'members', label: 'Members', icon: Users },
            { key: 'media', label: 'Media', icon: ImageIcon },
          ].map(({ key, label, icon: Icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, activeTab === key && styles.activeTabItem]}
              onPress={() => setActiveTab(key as any)}
            >
              <Icon size={16} color={activeTab === key ? '#A78BFA' : '#9CA3AF'} />
              <Text style={[styles.tabLabel, activeTab === key && styles.activeTabLabel]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPostComposer = () => (
    <TouchableOpacity onPress={() => setShowCreatePostModal(true)}>
      <View style={styles.postComposer}>
        <View style={styles.composerHeader}>
          <Image 
            source={{ uri: currentUserAvatar || 'https://via.placeholder.com/40' }} 
            style={styles.composerAvatar} 
          />
          <View style={styles.composerInputTrigger}>
            <Text style={styles.composerInputPlaceholder}>Write something...</Text>
          </View>
        </View>
        <View style={styles.composerActions}>
          <View style={styles.composerOption}>
            <ImageIcon size={20} color="#A78BFA" />
            <Text style={styles.composerOptionText}>Photo/Video</Text>
          </View>
          <View style={styles.composerOption}>
            <Calendar size={20} color="#A78BFA" />
            <Text style={styles.composerOptionText}>Event</Text>
          </View>
          <View style={styles.composerOption}>
            <MapPin size={20} color="#A78BFA" />
            <Text style={styles.composerOptionText}>Location</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity onPress={() => handleViewPost(item)}>
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image source={{ uri: item.profiles.avatar_url }} style={styles.postAvatar} />
          <View style={styles.postUserInfo}>
            <Text style={styles.postAuthor}>{item.profiles.username}</Text>
            <Text style={styles.postTime}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.location && (
              <View style={styles.postLocationContainer}>
                <MapPin size={14} color="#A78BFA" />
                <Text style={styles.postLocationText}>{item.location}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.postMoreButton} onPress={() => handleDeletePost(item.id)}>
            <MoreHorizontal size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.postContent}>{item.content}</Text>
        
        {item.media_url && (
          <View style={styles.postMediaContainer}>
            {item.media_type === 'image' ? (
              <Image source={{ uri: item.media_url }} style={styles.postImage} />
            ) : (
              <Video
                source={{ uri: item.media_url }}
                style={styles.postVideo}
                useNativeControls
                resizeMode={ResizeMode.COVER}
              />
            )}
          </View>
        )}
        
        <View style={styles.postEngagement}>
          <View style={styles.engagementStats}>
            <Text style={styles.engagementText}>
              {item.likes_count || 0} likes
            </Text>
            <Text style={styles.engagementText}>
              {item.comments_count || 0} comments
            </Text>
          </View>
          
          <View style={styles.engagementActions}>
            <TouchableOpacity 
              style={styles.engagementAction}
              onPress={() => handleLikePost(item.id)}
            >
              <Heart size={20} color={item.is_liked ? '#F472B6' : '#9CA3AF'} />
              <Text style={styles.engagementActionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.engagementAction} onPress={() => handleViewPost(item)}>
              <MessageCircle size={20} color="#9CA3AF" />
              <Text style={styles.engagementActionText}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.engagementAction}>
              <Share size={20} color="#9CA3AF" />
              <Text style={styles.engagementActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMembersTab = () => {
    console.log('Rendering members tab with members:', members.length);
    
    return (
      <View style={styles.membersContainer}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>Members • {members.length}</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Search size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {members.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No members yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to join this group!
            </Text>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { marginTop: 16 }]}
              onPress={handleJoinGroup}
            >
              <UserPlus size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <Image 
                source={{ 
                  uri: member.profiles?.avatar_url || 'https://via.placeholder.com/40' 
                }} 
                style={styles.memberAvatar} 
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.profiles?.username || 'Unknown User'}
                </Text>
                <View style={styles.memberMetaRow}>
                  <Text style={styles.memberJoinDate}>
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.memberActionButton}>
                <MoreHorizontal size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderCreatePostModal = () => (
    <Modal
      visible={showCreatePostModal}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowCreatePostModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            setShowCreatePostModal(false);
            setSelectedMedia(null);
            setNewPostContent('');
            setSelectedPostLocation('');
          }}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Post</Text>
          <TouchableOpacity 
            onPress={handleCreatePostWithMedia}
            disabled={!newPostContent.trim() && !selectedMedia}
            style={[
              styles.modalPostButton, 
              (!newPostContent.trim() && !selectedMedia) && styles.modalPostButtonDisabled
            ]}
          >
            {uploadingMedia || loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalPostButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.createPostContent}>
          {/* Post Input Area */}
          <View style={styles.createPostSection}>
            <View style={styles.createPostHeader}>
              <Image 
                source={{ uri: currentUserAvatar || 'https://via.placeholder.com/40' }} 
                style={styles.createPostAvatar} 
              />
              <View style={styles.createPostUserInfo}>
                <Text style={styles.createPostUsername}>You</Text>
                <Text style={styles.createPostGroupName}>Posting to {group.name}</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.createPostInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#9CA3AF"
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              autoFocus
            />
          </View>

          {/* Selected Media Preview */}
          {selectedMedia && (
            <View style={styles.selectedMediaContainer}>
              <View style={styles.selectedMediaHeader}>
                <Text style={styles.selectedMediaTitle}>
                  {selectedMedia.type === 'image' ? 'Photo' : 'Video'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setSelectedMedia(null)}
                  style={styles.removeMediaButton}
                >
                  <Text style={styles.removeMediaText}>Remove</Text>
                </TouchableOpacity>
              </View>
              {selectedMedia.type === 'image' ? (
                <Image source={{ uri: selectedMedia.uri }} style={styles.selectedMediaPreview} />
              ) : (
                <Video
                  source={{ uri: selectedMedia.uri }}
                  style={styles.selectedMediaPreview}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                />
              )}
            </View>
          )}

          {/* Location Input */}
          {selectedPostLocation ? (
            <View style={styles.selectedLocationContainer}>
              <View style={styles.selectedLocationHeader}>
                <MapPin size={16} color="#A78BFA" />
                <Text style={styles.selectedLocationText}>{selectedPostLocation}</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedPostLocation('')}
                  style={styles.removeLocationButton}
                >
                  <Text style={styles.removeLocationText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addLocationButton}
              onPress={() => setSelectedPostLocation('Current Location')} // Simplified for demo
            >
              <MapPin size={16} color="#A78BFA" />
              <Text style={styles.addLocationText}>Add Location</Text>
            </TouchableOpacity>
          )}

          {/* Media Options */}
          <View style={styles.mediaOptionsContainer}>
            <Text style={styles.mediaOptionsTitle}>Add to your post</Text>
            <View style={styles.mediaOptionsGrid}>
              <TouchableOpacity 
                style={styles.mediaOptionButton}
                onPress={handlePickMedia}
              >
                <ImageIcon size={24} color="#A78BFA" />
                <Text style={styles.mediaOptionText}>Photo/Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaOptionButton}
                onPress={handleTakePhoto}
              >
                <Camera size={24} color="#A78BFA" />
                <Text style={styles.mediaOptionText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaOptionButton}
                onPress={() => Alert.alert('Coming Soon', 'Event creation feature coming soon!')}
              >
                <Calendar size={24} color="#A78BFA" />
                <Text style={styles.mediaOptionText}>Event</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaOptionButton}
                onPress={handleCheckIn}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size={24} color="#A78BFA" />
                ) : (
                  <MapPin size={24} color="#A78BFA" />
                )}
                <Text style={styles.mediaOptionText}>
                  {gettingLocation ? 'Getting Location...' : 'Check In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upload Progress */}
          {uploadingMedia && (
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator size="small" color="#A78BFA" />
              <Text style={styles.uploadProgressText}>Uploading media...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderMediaTab = () => {
    // Filter posts that have media
    const mediaOnlyPosts = posts.filter(post => post.media_url);

    if (mediaOnlyPosts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ImageIcon size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No media yet</Text>
          <Text style={styles.emptyStateSubtext}>
            When members share photos or videos, they'll appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <View style={styles.mediaHeader}>
          <Text style={styles.mediaTitle}>Photos & Videos • {mediaOnlyPosts.length}</Text>
        </View>
        
        <View style={styles.mediaGrid}>
          {mediaOnlyPosts.map((post, index) => (
            <TouchableOpacity
              key={post.id}
              style={styles.mediaGridItem}
              onPress={() => handleViewPost(post)}
            >
              {post.media_type === 'image' ? (
                <Image 
                  source={{ uri: post.media_url }} 
                  style={styles.mediaGridImage}
                />
              ) : (
                <View style={styles.videoThumbnailContainer}>
                  <Video
                    source={{ uri: post.media_url! }}
                    style={styles.mediaGridImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping={false}
                    isMuted={true}
                  />
                  <View style={styles.videoPlayIcon}>
                    <View style={styles.playIconBackground}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Author overlay */}
              <View style={styles.mediaOverlay}>
                <Image 
                  source={{ uri: post.profiles.avatar_url }} 
                  style={styles.mediaAuthorAvatar}
                />
                <Text style={styles.mediaAuthorName}>{post.profiles.username}</Text>
              </View>
              
              {/* Engagement stats */}
              <View style={styles.mediaStats}>
                <View style={styles.mediaStat}>
                  <Heart size={12} color="#FFFFFF" />
                  <Text style={styles.mediaStatText}>{post.likes_count || 0}</Text>
                </View>
                <View style={styles.mediaStat}>
                  <MessageCircle size={12} color="#FFFFFF" />
                  <Text style={styles.mediaStatText}>{post.comments_count || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
            <Text style={styles.modalCloseText}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Group Settings</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <ScrollView style={styles.settingsContent}>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Your Settings</Text>
            
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={handleToggleNotifications}
            >
              <Bell size={20} color={notifications ? "#A78BFA" : "#9CA3AF"} />
              <Text style={styles.settingsItemText}>
                Notifications {notifications ? '(On)' : '(Off)'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={handleLeaveGroup}
            >
              <UserX size={20} color="#EF4444" />
              <Text style={[styles.settingsItemText, { color: '#EF4444' }]}>Leave Group</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsItem}
              onPress={handleReportGroup}
            >
              <Flag size={20} color="#EF4444" />
              <Text style={[styles.settingsItemText, { color: '#EF4444' }]}>Report Group</Text>
            </TouchableOpacity>
          </View>

          {userRole === 'admin' && (
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Admin Settings</Text>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Settings size={20} color="#9CA3AF" />
                <Text style={styles.settingsItemText}>Group Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Users size={20} color="#9CA3AF" />
                <Text style={styles.settingsItemText}>Manage Members</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Shield size={20} color="#9CA3AF" />
                <Text style={styles.settingsItemText}>Admin Tools</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );


  const renderMainContent = () => {
    switch (activeTab) {
      case 'discussion':
        return (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                {renderGroupHeader()}
                {isMember && renderPostComposer()}
              </View>
            }
            showsVerticalScrollIndicator={false}
            style={styles.contentContainer}
          />
        );
      case 'members':
        return (
          <FlatList
            data={[{ id: 'members' }]}
            renderItem={() => null}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                {renderGroupHeader()}
                {renderMembersTab()}
              </View>
            }
            showsVerticalScrollIndicator={false}
            style={styles.contentContainer}
          />
        );
      case 'media':
        return (
          <FlatList
            data={[{ id: 'media' }]}
            renderItem={() => null}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                {renderGroupHeader()}
                {renderMediaTab()}
              </View>
            }
            showsVerticalScrollIndicator={false}
            style={styles.contentContainer}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header with back button */}
        <View style={styles.navigationHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.navigationTitle}>{group.name}</Text>
          <TouchableOpacity style={styles.headerMoreButton}>
            <MoreHorizontal size={24} color="#F9FAFB" />
          </TouchableOpacity>
        </View>

        {renderMainContent()}
        {renderCreatePostModal()}
        {renderSettingsModal()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    flex: 1,
    textAlign: 'center',
  },
  headerMoreButton: {
    padding: 8,
  },
  headerContainer: {
    backgroundColor: '#1F2937',
  },
  coverPhotoContainer: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  groupInfoContainer: {
    padding: 16,
  },
  groupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupTitleContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupPrivacy: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  moreButton: {
    padding: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#A78BFA',
    flex: 1,
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#374151',
    width: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  tabNavigation: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#A78BFA',
  },
  tabLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#A78BFA',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  postComposer: {
    backgroundColor: '#1F2937',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  composerInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  composerInputTrigger: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  composerInputPlaceholder: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  composerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerOptionText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '500',
  },
  postSubmitButton: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postSubmitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postMoreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
    marginBottom: 12,
  },
  postMediaContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  postVideo: {
    width: '100%',
    height: 200,
  },
  postMetaSeparator: {
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  postLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  postEngagement: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  engagementText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  engagementActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  engagementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  engagementActionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  membersContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  searchButton: {
    padding: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    gap: 2,
  },
  roleText: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '500',
  },
  memberJoinDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  memberActionButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  mediaContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaGridItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#374151',
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  playIconBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 2,
  },
  mediaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  mediaAuthorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  mediaAuthorName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  mediaStats: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  mediaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  mediaStatText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalCloseText: {
    color: '#A78BFA',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  settingsContent: {
    flex: 1,
  },
  settingsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  // Create Post Modal Styles
  modalPostButton: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalPostButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  modalPostButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  createPostContent: {
    flex: 1,
  },
  createPostSection: {
    backgroundColor: '#1F2937',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  createPostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  createPostUserInfo: {
    flex: 1,
  },
  createPostUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  createPostGroupName: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  createPostInput: {
    color: '#F9FAFB',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectedMediaContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  selectedMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedMediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  removeMediaButton: {
    padding: 4,
  },
  removeMediaText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedMediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  selectedLocationContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  selectedLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLocationText: {
    color: '#F9FAFB',
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  removeLocationButton: {
    padding: 4,
  },
  removeLocationText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  addLocationButton: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addLocationText: {
    color: '#A78BFA',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  mediaOptionsContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  mediaOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  mediaOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaOptionButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    gap: 8,
  },
  mediaOptionText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadProgressContainer: {
    backgroundColor: '#1F2937',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadProgressText: {
    color: '#A78BFA',
    fontSize: 16,
  },
  postLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  postLocationText: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '500',
    marginLeft: 4,
  },
  groupDetailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  groupDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  groupMetaDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDetailText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  expandableSection: {
    marginBottom: 12,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  readMoreText: {
    color: '#A78BFA',
    fontWeight: '600',
  },
  groupRulesTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
