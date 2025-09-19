import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
// Removed DateTimePicker import - using custom modal solution
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Image as ImageIcon, Calendar, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';

export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  
  // Temporary state for date/time inputs
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear().toString());
  const [tempMonth, setTempMonth] = useState((selectedDate.getMonth() + 1).toString().padStart(2, '0'));
  const [tempDay, setTempDay] = useState(selectedDate.getDate().toString().padStart(2, '0'));
  const [tempHours, setTempHours] = useState(selectedTime.getHours().toString().padStart(2, '0'));
  const [tempMinutes, setTempMinutes] = useState(selectedTime.getMinutes().toString().padStart(2, '0'));

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openDatePicker = () => {
    // Initialize temp values with current date
    setTempYear(selectedDate.getFullYear().toString());
    setTempMonth((selectedDate.getMonth() + 1).toString().padStart(2, '0'));
    setTempDay(selectedDate.getDate().toString().padStart(2, '0'));
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const saveDatePicker = () => {
    const year = parseInt(tempYear) || new Date().getFullYear();
    const month = Math.max(1, Math.min(12, parseInt(tempMonth) || 1)) - 1;
    const day = Math.max(1, Math.min(31, parseInt(tempDay) || 1));
    
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const openTimePicker = () => {
    // Initialize temp values with current time
    setTempHours(selectedTime.getHours().toString().padStart(2, '0'));
    setTempMinutes(selectedTime.getMinutes().toString().padStart(2, '0'));
    setShowTimePicker(true);
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
  };

  const saveTimePicker = () => {
    const hours = Math.max(0, Math.min(23, parseInt(tempHours) || 0));
    const minutes = Math.max(0, Math.min(59, parseInt(tempMinutes) || 0));
    
    const newTime = new Date(selectedTime);
    newTime.setHours(hours, minutes);
    setSelectedTime(newTime);
    setShowTimePicker(false);
  };

  const handleCreateEvent = async () => {
    if (!name.trim() || !description.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create an event.');
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (imageUri) {
        const fileExt = imageUri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `event-images/${fileName}`;

        // Get file info using FileSystem (same as create post)
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
          throw new Error('File not found');
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, {
            uri: fileInfo.uri,
            type: `image/${fileExt}`,
            name: filePath,
          } as any);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      // Format date and time for database storage
      const eventDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const eventTime = selectedTime.toTimeString().split(' ')[0]; // HH:MM:SS format

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            name,
            description,
            date: eventDate,
            time: eventTime,
            location,
            image_url: imageUrl,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Event created successfully!');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Event</Text>
        </View>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={styles.input}
            placeholder="Event Name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Event Description"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.row}>
            <Calendar size={20} color="#9CA3AF" />
            <TouchableOpacity 
              style={styles.rowInput} 
              onPress={openDatePicker}
            >
              <Text style={styles.inputText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Clock size={20} color="#9CA3AF" />
            <TouchableOpacity 
              style={styles.rowInput} 
              onPress={openTimePicker}
            >
              <Text style={styles.inputText}>
                {selectedTime.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <MapPin size={20} color="#9CA3AF" />
            <TextInput
              style={styles.rowInput}
              placeholder="Location"
              placeholderTextColor="#9CA3AF"
              value={location}
              onChangeText={setLocation}
            />
          </View>
          <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePick}>
            <ImageIcon size={20} color="#FFFFFF" />
            <Text style={styles.imagePickerButtonText}>Select Event Image</Text>
          </TouchableOpacity>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateEvent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        
        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={closeDatePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY"
                  placeholderTextColor="#9CA3AF"
                  value={tempYear}
                  onChangeText={setTempYear}
                  keyboardType="numeric"
                  maxLength={4}
                  selectTextOnFocus={true}
                />
                <Text style={styles.dateSeparator}>-</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="MM"
                  placeholderTextColor="#9CA3AF"
                  value={tempMonth}
                  onChangeText={setTempMonth}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus={true}
                />
                <Text style={styles.dateSeparator}>-</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD"
                  placeholderTextColor="#9CA3AF"
                  value={tempDay}
                  onChangeText={setTempDay}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus={true}
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={closeDatePicker}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={saveDatePicker}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={closeTimePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="HH"
                  placeholderTextColor="#9CA3AF"
                  value={tempHours}
                  onChangeText={setTempHours}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus={true}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="MM"
                  placeholderTextColor="#9CA3AF"
                  value={tempMinutes}
                  onChangeText={setTempMinutes}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus={true}
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={closeTimePicker}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalButton} 
                  onPress={saveTimePicker}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  input: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rowInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  createButton: {
    backgroundColor: '#A78BFA',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  imagePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dateInput: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 60,
  },
  dateSeparator: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeInput: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 50,
  },
  timeSeparator: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#A78BFA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
});
