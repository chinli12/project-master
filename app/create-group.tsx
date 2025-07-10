import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  Globe, 
  Lock, 
  MapPin, 
  Users,
  Hash,
  FileText,
  CheckCircle,
  X,
  ChevronRight,
  Sparkles,
  Shield,
  Navigation
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'travel', name: 'Travel & Places', icon: '🗺️', color: '#10B981', description: 'Explore destinations together' },
  { id: 'photography', name: 'Photography', icon: '📸', color: '#8B5CF6', description: 'Capture moments and memories' },
  { id: 'adventure', name: 'Adventure', icon: '🏔️', color: '#F59E0B', description: 'Outdoor activities and thrills' },
  { id: 'culture', name: 'Culture & History', icon: '🏛️', color: '#EF4444', description: 'Discover heritage and traditions' },
  { id: 'food', name: 'Food & Dining', icon: '🍽️', color: '#06B6D4', description: 'Culinary experiences and tastings' },
  { id: 'sports', name: 'Sports & Fitness', icon: '⚽', color: '#84CC16', description: 'Active lifestyle and wellness' },
  { id: 'art', name: 'Arts & Crafts', icon: '🎨', color: '#EC4899', description: 'Creative expression and making' },
  { id: 'tech', name: 'Technology', icon: '💻', color: '#6366F1', description: 'Innovation and digital trends' },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Form state
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public' as 'public' | 'private',
    location: '',
    image_url: '',
    rules: '',
  });

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationLoading, setLocationLoading] = useState(false);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!groupData.name.trim()) {
        newErrors.name = 'Group name is required';
      } else if (groupData.name.length < 3) {
        newErrors.name = 'Name must be at least 3 characters';
      }

      if (!groupData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (groupData.description.length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      }
    }

    if (step === 2) {
      if (!groupData.category) {
        newErrors.category = 'Please select a category';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const animateTransition = (newStep: number) => {
    Animated.timing(slideAnim, {
      toValue: -(width * (newStep - 1)),
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        animateTransition(newStep);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      animateTransition(newStep);
    } else {
      router.back();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable location permissions to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const locationString = [
          address.name,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        
        setGroupData(prev => ({ ...prev, location: locationString }));
      } else {
        setGroupData(prev => ({ 
          ...prev, 
          location: `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}` 
        }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const openLocationPicker = () => {
    Alert.alert(
      'Select Location',
      'Choose how you want to set your group location:',
      [
        {
          text: 'Current Location',
          onPress: getCurrentLocation,
        },
        {
          text: 'Enter Manually',
          onPress: () => {
            // Keep the current text input focused
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

  const uploadImage = async (uri: string, userId: string): Promise<string | null> => {
    try {
      // For React Native, we need to use FormData for file uploads
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `group-images/${userId}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      const storageBucket = supabase.storage.from('posts'); // Use existing posts bucket

      const { error: uploadError } = await storageBucket.upload(filePath, formData, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = storageBucket.getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error('Error uploading image:', e);
      return null;
    }
  };

  const createGroup = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      Alert.alert('Incomplete Information', 'Please fill out all required fields before creating the group.');
      return;
    }

    setIsLoading(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a group.');
        setIsLoading(false);
        return;
      }

      let finalImageUrl = null;
      if (selectedImage) {
        finalImageUrl = await uploadImage(selectedImage, user.id);
        if (!finalImageUrl) {
          Alert.alert('Image Upload Failed', 'The group will be created without a cover image.');
        }
      }

      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          category: groupData.category,
          privacy: groupData.privacy,
          rules: groupData.rules || null,
          location: groupData.location || null,
          image_url: finalImageUrl,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'admin',
      });

      Alert.alert(
        'Success! 🎉',
        'Your group has been created successfully!',
        [{
          text: 'View Group',
          onPress: () => router.replace({
            pathname: '/group-details',
            params: { group: JSON.stringify(newGroup) }
          })
        }]
      );
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(currentStep / 4) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>Step {currentStep} of 4</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Let's start with the basics</Text>
        <Text style={styles.stepSubtitle}>Give your group a name and describe what it's about.</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.inputIconContainer}><Hash size={20} color="#A78BFA" /></View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g., Local Heritage Explorers"
              placeholderTextColor="#6B7280"
              value={groupData.name}
              onChangeText={(text) => {
                setGroupData(prev => ({ ...prev, name: text }));
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              maxLength={50}
            />
            <Text style={styles.characterCount}>{groupData.name.length}/50</Text>
          </View>
        </View>
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <View style={styles.inputGroup}>
          <View style={styles.inputIconContainer}><FileText size={20} color="#A78BFA" /></View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe the purpose of your group, what you'll do, and who should join."
              placeholderTextColor="#6B7280"
              value={groupData.description}
              onChangeText={(text) => {
                setGroupData(prev => ({ ...prev, description: text }));
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              multiline
              maxLength={200}
            />
            <Text style={styles.characterCount}>{groupData.description.length}/200</Text>
          </View>
        </View>
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Customize your group</Text>
        <Text style={styles.stepSubtitle}>Choose a category and set your privacy.</Text>
      </View>

      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map(cat => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.categoryCard, groupData.category === cat.id && styles.categoryCardSelected]}
            onPress={() => {
              setGroupData(prev => ({ ...prev, category: cat.id }));
              if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
            }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryName}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

      <Text style={styles.sectionTitle}>Privacy</Text>
      <View style={styles.privacyContainer}>
        <TouchableOpacity 
          style={[styles.privacyOption, groupData.privacy === 'public' && styles.privacyOptionSelected]}
          onPress={() => setGroupData(prev => ({ ...prev, privacy: 'public' }))}
        >
          <Globe size={24} color={groupData.privacy === 'public' ? '#A78BFA' : '#9CA3AF'} />
          <Text style={[styles.privacyTitle, groupData.privacy === 'public' && styles.privacyTitleSelected]}>Public</Text>
          <Text style={styles.privacyDescription}>Anyone can see the group, its members, and their posts.</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.privacyOption, groupData.privacy === 'private' && styles.privacyOptionSelected]}
          onPress={() => setGroupData(prev => ({ ...prev, privacy: 'private' }))}
        >
          <Lock size={24} color={groupData.privacy === 'private' ? '#A78BFA' : '#9CA3AF'} />
          <Text style={[styles.privacyTitle, groupData.privacy === 'private' && styles.privacyTitleSelected]}>Private</Text>
          <Text style={styles.privacyDescription}>Only members can see who's in the group and what they post.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Add a cover image</Text>
        <Text style={styles.stepSubtitle}>This helps people recognize your group. (Optional)</Text>
      </View>

      <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <ImageIcon size={48} color="#A78BFA" />
            <Text style={styles.imagePickerText}>Tap to upload an image</Text>
            <Text style={styles.imagePickerSubtext}>16:9 ratio recommended</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <ImageIcon size={20} color="#A78BFA" />
          <Text style={styles.imageButtonText}>Choose from Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
          <Camera size={20} color="#A78BFA" />
          <Text style={styles.imageButtonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>
      {selectedImage && (
        <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
          <X size={16} color="#EF4444" />
          <Text style={styles.removeImageText}>Remove Image</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Final touches</Text>
        <Text style={styles.stepSubtitle}>Add a location and some rules for your members. (Optional)</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.inputIconContainer}><MapPin size={20} color="#A78BFA" /></View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Location</Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                placeholder="e.g., Lagos, Nigeria"
                placeholderTextColor="#6B7280"
                value={groupData.location}
                onChangeText={(text) => setGroupData(prev => ({ ...prev, location: text }))}
              />
              <TouchableOpacity 
                style={styles.locationPickerButton} 
                onPress={openLocationPicker}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#A78BFA" />
                ) : (
                  <Navigation size={16} color="#A78BFA" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputIconContainer}><Shield size={20} color="#A78BFA" /></View>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Group Rules</Text>
            <TextInput
              style={styles.textArea}
              placeholder="1. Be kind and respectful.&#10;2. No promotions or spam.&#10;3. Keep discussions relevant."
              placeholderTextColor="#6B7280"
              value={groupData.rules}
              onChangeText={(text) => setGroupData(prev => ({ ...prev, rules: text }))}
              multiline
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      {currentStep > 1 && (
        <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
          <Text style={styles.prevButtonText}>Back</Text>
        </TouchableOpacity>
      )}
      {currentStep < 4 ? (
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
          <Text style={styles.nextButtonText}>Next Step</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, { flex: 1, alignItems: 'flex-end' }]}>
          <TouchableOpacity style={styles.createButton} onPress={createGroup} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Sparkles size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <ArrowLeft size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a Group</Text>
          <View style={{ width: 40 }} />
        </View>

        {renderProgressBar()}

        <ScrollView 
          style={styles.contentContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          <Animated.View style={[styles.stepsWrapper, { transform: [{ translateX: slideAnim }] }]}>
            {renderStep1()}
            {renderStep2()}
            {renderStep3()}
            {renderStep4()}
          </Animated.View>
        </ScrollView>

        {renderNavigation()}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    width: width,
    height: '100%',
  },
  stepsWrapper: {
    flexDirection: 'row',
    width: width * 4,
  },
  stepHeader: {
    marginBottom: 32,
    marginTop: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  inputContainer: {
    gap: 24,
  },
  inputGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  inputIconContainer: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    color: '#1F2937',
    fontSize: 16,
    paddingVertical: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    borderBottomWidth: 1,
  },
  textArea: {
    color: '#1F2937',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  characterCount: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    marginTop: -16,
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  privacyContainer: {
    gap: 12,
  },
  privacyOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  privacyOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    marginLeft: 36,
    marginTop: -26,
  },
  privacyTitleSelected: {
    color: '#3B82F6',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  imagePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePickerSubtext: {
    color: '#6B7280',
    fontSize: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  removeImageText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  locationPickerButton: {
    backgroundColor: '#E5E7EB',
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  prevButton: {
    padding: 16,
  },
  prevButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
