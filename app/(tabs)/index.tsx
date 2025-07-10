import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star, Clock, Share, Car, Play, Pause, Sparkles, Volume2, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  narrative: string;
  highlights: string[];
  rating: number;
  visitTime: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNarrationLoading, setIsNarrationLoading] = useState(false);
  const mapRef = useRef<MapView>(null);
  const lastNarrativeLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const { user } = useAuth();

  const generateLocationNarrative = async (lat: number, lng: number) => {
    if (lastNarrativeLocation.current) {
      const distance = getDistance(
        lastNarrativeLocation.current.latitude,
        lastNarrativeLocation.current.longitude,
        lat,
        lng
      );
      console.log(`Distance from last narrative location: ${distance} meters`);
      if (distance < 20) { // Only generate new narrative if moved more than 20 meters
        setLoading(false);
        return;
      }
    }

    console.log(`Generating narrative for lat: ${lat}, lng: ${lng}`);
    if (!GEMINI_API_KEY) {
      Alert.alert('Error', 'Gemini API key is not configured.');
      setLoading(false);
      return;
    }
    try {
      const addressResponse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const address = addressResponse[0];
      const locationName = `${address.city}, ${address.region}, ${address.country}`;

      const prompt = `Provide a historical and cultural summary for ${locationName}. The summary should include the location's name, a narrative, some highlights, a rating out of 5, and an estimated visit time. Please format the response as a JSON object with the following keys: "name", "narrative", "highlights", "rating", "visitTime".`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
        }),
      });

      const json = await response.json();

      if (json.candidates && json.candidates.length > 0 && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts.length > 0 && json.candidates[0].content.parts[0].text) {
        let responseText = json.candidates[0].content.parts[0].text;
        
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '');
        
        const data = JSON.parse(responseText);
        
        const newLocationData = {
          latitude: lat,
          longitude: lng,
          ...data,
        };
        setLocationData(newLocationData);
        lastNarrativeLocation.current = { latitude: lat, longitude: lng };

        // Save to places_visited table if not already recorded
        if (user) {
          const { data: existingPlaces, error: fetchError } = await supabase
            .from('places_visited')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', newLocationData.name)
            .eq('latitude', newLocationData.latitude)
            .eq('longitude', newLocationData.longitude);

          if (fetchError) {
            console.error('Error checking existing places:', fetchError);
            Alert.alert('Error', 'Failed to check visited places.');
          } else if (!existingPlaces || existingPlaces.length === 0) {
            const { error: insertError } = await supabase
              .from('places_visited')
              .insert({
                user_id: user.id,
                name: newLocationData.name,
              latitude: newLocationData.latitude,
              longitude: newLocationData.longitude,
              image_url: newLocationData.image_url || null, // Only save if available, otherwise null
            });

            if (insertError) {
              console.error('Error inserting place visited:', insertError);
              Alert.alert('Error', 'Failed to save visited place.');
            }
          } else {
            console.log('Place already visited and recorded:', newLocationData.name);
          }
        }

      } else {
        // Handle the case where no valid response is received
        console.error("Invalid response structure from Gemini API:", json);
        Alert.alert('Error', 'Failed to get location summary due to an invalid response.');
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get location summary.');
    } finally {
      setLoading(false);
    }
  };

  const playNarration = async (text: string) => {
    if (sound) {
      await sound.unloadAsync();
    }

    if (!ELEVENLABS_API_KEY) {
      Alert.alert('Error', 'ElevenLabs API key not set.');
      setIsNarrationLoading(false);
      return;
    }
    
    try {
      setIsNarrationLoading(true);
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      const audioBlob = await response.blob();
      const fileReader = new FileReader();
      fileReader.readAsDataURL(audioBlob);
      fileReader.onload = async () => {
        try {
          const base64Data = fileReader.result as string;
          const uri = FileSystem.documentDirectory + 'narration.mp3';
          await FileSystem.writeAsStringAsync(uri, base64Data.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });

          const { sound: newSound, status } = await Audio.Sound.createAsync({ uri });
          if (status.isLoaded) {
            setSound(newSound);
            await newSound.playAsync();
            setIsPlaying(true);
          } else {
            Alert.alert('Error', 'Could not load audio for playback.');
          }
        } catch (e) {
          console.error("Error playing narration:", e);
          Alert.alert('Error', 'Failed to play narration.');
        } finally {
          setIsNarrationLoading(false);
        }
      };
      fileReader.onerror = (error) => {
        console.error("FileReader error:", error);
        Alert.alert('Error', 'Failed to read audio file.');
        setIsNarrationLoading(false);
      };

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to play narration.');
      setIsNarrationLoading(false);
    }
  };
  
  const handlePlayPause = async () => {
    if (!sound) {
      if (locationData) {
        playNarration(locationData.narrative);
      }
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const initialize = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      setLoading(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setUserLocation(location);
    generateLocationNarrative(location.coords.latitude, location.coords.longitude);
    
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  useEffect(() => {
    initialize();

    return () => {
      sound?.unloadAsync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Sparkles size={28} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.title}>GeoTeller</Text>
            </View>
            <Text style={styles.subtitle}>Discover the stories around you</Text>
          </View>
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              mapType={Platform.OS === 'android' ? 'standard' : 'mutedStandard'}
            >
              {userLocation && (
                <Marker
                  coordinate={userLocation.coords}
                  title="Your Location"
                >
                  <Image source={require('@/assets/images/marker.png')} style={{ height: 40, width: 40 }} />
                </Marker>
              )}
            </MapView>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.glassCard}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={styles.loadingText}>Generating your location story...</Text>
            </View>
          ) : locationData ? (
            <View style={styles.glassCard}>
              <View style={styles.locationHeader}>
                <View style={styles.locationTitleRow}>
                  <MapPin size={20} color="#A78BFA" strokeWidth={2.5} />
                  <Text style={styles.locationTitle}>{locationData.name}</Text>
                </View>
                <View style={styles.locationMeta}>
                  <View style={styles.ratingContainer}>
                    <Star size={18} color="#FBBF24" fill="#FBBF24" strokeWidth={2} />
                    <Text style={styles.rating}>{locationData.rating}</Text>
                  </View>
                  <View style={styles.timeContainer}>
                    <Clock size={18} color="#9CA3AF" strokeWidth={2} />
                    <Text style={styles.visitTime}>{locationData.visitTime}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.playButton} onPress={handlePlayPause} disabled={isNarrationLoading}>
                <View style={styles.playButtonInner}>
                  <Volume2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                {isNarrationLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 8 }} />
                ) : isPlaying ? (
                    <Pause size={20} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                ) : (
                    <Play size={20} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                )}
                  <Text style={styles.playButtonText}>
                    {isNarrationLoading ? 'Loading...' : isPlaying ? 'Pause Story' : 'Play Story'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.narrative}>{locationData.narrative}</Text>

              <View style={styles.highlightsContainer}>
                <Text style={styles.highlightsTitle}>✨ Did you know?</Text>
                {Array.isArray(locationData.highlights) && locationData.highlights.map((highlight, index) => (
                  <View key={index} style={styles.highlightItem}>
                    <View style={styles.highlightBullet}>
                      <Text style={styles.highlightBulletText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.shareButton}>
                <Share size={18} color="#A78BFA" strokeWidth={2.5} />
                <Text style={styles.shareText}>Share this story</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.refreshButton} onPress={initialize}>
                <RefreshCw size={18} color="#A78BFA" strokeWidth={2.5} />
                <Text style={styles.refreshText}>Refresh Story</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.glassCard}>
              <MapPin size={50} color="#A78BFA" strokeWidth={2} />
              <Text style={styles.emptyTitle}>No location story yet</Text>
              <Text style={styles.emptySubtitle}>
                Enable location services to discover the fascinating stories around you
              </Text>
              <TouchableOpacity style={styles.enableButton} onPress={initialize}>
                <Text style={styles.enableButtonText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => router.push('/directions')}
        >
          <Car size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
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
    height: height * 0.6,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
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
    marginLeft: 40,
  },
  mapContainer: {
    height: height * 0.25,
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  glassCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  locationHeader: {
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontSize: 17,
    fontFamily: 'Inter-Medium',
    color: '#FBBF24',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitTime: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  playButton: {
    marginVertical: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  playButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  narrative: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    lineHeight: 26,
    marginBottom: 24,
    textAlign: 'center',
    flexShrink: 1,
  },
  highlightsContainer: {
    marginVertical: 24,
    width: '100%',
  },
  highlightsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightBullet: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightBulletText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  highlightText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 22,
    flexShrink: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  shareText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#A78BFA',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  refreshText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#A78BFA',
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#F9FAFB',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  enableButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  enableButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  directionsButton: {
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
  },
});
