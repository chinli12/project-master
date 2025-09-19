import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Image as ImageIcon, Video, Type } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Video as ExpoVideo, ResizeMode, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Video as VideoCompressor } from 'react-native-compressor';

// Configure audio for iOS to play in silent mode
if (Platform.OS === 'ios') {
  Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
  });
}

export default function CreatePost() {

  const router = useRouter();
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [text, setText] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Automatically capture user location when component mounts
  useEffect(() => {
    const captureLocation = async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        // Reverse geocode to get address
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const locationString = `${address.city || address.subregion || address.region}, ${address.country}`;
          setUserLocation(locationString);
          console.log('Location captured:', locationString);
        }
      } catch (error) {
        console.error('Error capturing location:', error);
      }
    };

    captureLocation();
  }, []);

  const handleMediaPick = async (type: 'image' | 'video') => {
    const mediaTypeOption = type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos;
    const action = type === 'image' ? 'Photo' : 'Video';

    Alert.alert(
      `Add a ${action}`,
      `Choose an option`,
      [
        {
          text: `Take ${action}`,
          onPress: async () => {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraPermission.status !== 'granted') {
              Alert.alert('Permission needed', `Camera permission is required to take a ${type}.`);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: mediaTypeOption,
              quality: 1,
            });
            if (!result.canceled) {
              setMediaUri(result.assets[0].uri);
            }
          },
        },
        {
          text: `Choose from Library`,
          onPress: async () => {
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libraryPermission.status !== 'granted') {
                Alert.alert('Permission needed', `Media library permission is required to choose a ${type}.`);
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: mediaTypeOption,
              quality: 1,
            });
            if (!result.canceled) {
              setMediaUri(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handlePost = async () => {
    if (!text.trim() && !mediaUri) {
      Alert.alert('Error', 'Please add some content to your post.');
      return;
    }

    setLoading(true);

    try {
      let mediaUrl: string | null = null;
      if (mediaUri) {
        const fileExt = mediaUri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        let uploadUri = mediaUri;
        if (postType === 'video') {
          const fileInfo = await FileSystem.getInfoAsync(mediaUri);
          if (fileInfo.exists && fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
            const compressedUri = await VideoCompressor.compress(mediaUri, {
              compressionMethod: 'auto',
            });
            uploadUri = compressedUri;
          }
        }

        const finalFileInfo = await FileSystem.getInfoAsync(uploadUri);
        if (!finalFileInfo.exists) {
          throw new Error('File not found');
        }

        const { data, error } = await supabase.storage
          .from('posts')
          .upload(filePath, {
            uri: finalFileInfo.uri,
            type: `${postType}/${fileExt}`,
            name: filePath,
          } as any);

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(data.path);
        mediaUrl = urlData.publicUrl;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content: text,
            media_url: mediaUrl,
            media_type: postType,
            location: userLocation,
            user_id: user?.id,
          },
        ]);

      if (postError) {
        throw postError;
      }

      Alert.alert('Success', 'Your post has been created!');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Post</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, postType === 'text' && styles.activeType]}
              onPress={() => setPostType('text')}
            >
              <Type size={20} color={postType === 'text' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.typeButtonText, postType === 'text' && styles.activeTypeText]}>Text</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, postType === 'image' && styles.activeType]}
              onPress={() => {
                setPostType('image');
                handleMediaPick('image');
              }}
            >
              <ImageIcon size={20} color={postType === 'image' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.typeButtonText, postType === 'image' && styles.activeTypeText]}>Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, postType === 'video' && styles.activeType]}
              onPress={() => {
                setPostType('video');
                handleMediaPick('video');
              }}
            >
              <Video size={20} color={postType === 'video' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.typeButtonText, postType === 'video' && styles.activeTypeText]}>Video</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            multiline
            value={text}
            onChangeText={setText}
          />

          {mediaUri && (
            <View style={styles.mediaPreview}>
              {postType === 'image' ? (
                <Image source={{ uri: mediaUri }} style={styles.media} />
              ) : (
                <ExpoVideo
                  source={{ uri: mediaUri }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  shouldPlay
                  isLooping
                  style={styles.media}
                />
              )}
            </View>
          )}

          <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  content: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 6,
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  activeType: {
    backgroundColor: '#4F46E5',
  },
  typeButtonText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  activeTypeText: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  mediaPreview: {
    marginBottom: 20,
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  postButton: {
    backgroundColor: '#A78BFA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
