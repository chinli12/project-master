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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { MapPin, Star, Clock, Share, Car, Play, Pause, Sparkles, Volume2, RefreshCw, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

// Configure audio for iOS to play in silent mode
if (Platform.OS === 'ios') {
  Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
  });
}

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
  summary: string; // Added for the brief summary
  highlights: string[];
  rating: number;
  visitTime: string;
  image_url?: string;
}

// Types for Gemini API Response
interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
}

export default function HomeScreen() {

  const router = useRouter();
  const { t } = useTranslation();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [narrativeSound, setNarrativeSound] = useState<Audio.Sound | null>(null);
  const [summarySound, setSummarySound] = useState<Audio.Sound | null>(null);
  const [isPlayingNarrative, setIsPlayingNarrative] = useState(false);
  const [isPlayingSummary, setIsPlayingSummary] = useState(false);
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [lastNarrativeLocation, setLastNarrativeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastAlertLocation, setLastAlertLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const { user } = useAuth();

  const generateLocationNarrative = async (lat: number, lng: number) => {
    if (lastNarrativeLocation) {
      const distance = getDistance(
        lastNarrativeLocation.latitude,
        lastNarrativeLocation.longitude,
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

      const prompt = `Provide a historical and cultural summary for ${locationName}. The summary should include the location's name, a detailed narrative, a brief one-sentence summary of the narrative, some highlights, a rating out of 5, and an estimated visit time. Please format the response as a JSON object with the following keys: "name", "narrative", "summary", "highlights", "rating", "visitTime".`;
      
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

      const json = await response.json() as GeminiResponse;

      let responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        
        
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '');
        
        const data = JSON.parse(responseText);
        
        const newLocationData = {
          latitude: lat,
          longitude: lng,
          ...data,
        };
        setLocationData(newLocationData);
        setLastNarrativeLocation({ latitude: lat, longitude: lng });

        // Create location alert for this new story
        await createLocationAlert(newLocationData);

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

  const playAudio = async (
    text: string,
    type: 'narrative' | 'summary',
    setSound: (sound: Audio.Sound | null) => void,
    setIsLoading: (loading: boolean) => void,
    setIsPlaying: (playing: boolean) => void
  ) => {
    if (!ELEVENLABS_API_KEY) {
      Alert.alert('Error', 'ElevenLabs API key not set.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
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
          const uri = `${FileSystem.documentDirectory}${type}.mp3`;
          await FileSystem.writeAsStringAsync(uri, base64Data.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });

          const { sound: newSound, status } = await Audio.Sound.createAsync({ uri });
          if (status.isLoaded) {
            setSound(newSound);
            await newSound.playAsync();
            setIsPlaying(true);
          } else {
            Alert.alert('Error', `Could not load ${type} audio for playback.`);
          }
        } catch (e) {
          console.error(`Error playing ${type}:`, e);
          Alert.alert('Error', `Failed to play ${type}.`);
        } finally {
          setIsLoading(false);
        }
      };
      fileReader.onerror = (error) => {
        console.error('FileReader error:', error);
        Alert.alert('Error', `Failed to read ${type} audio file.`);
        setIsLoading(false);
      };
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to play ${type}.`);
      setIsLoading(false);
    }
  };
  
  const handlePlayPauseNarrative = async () => {
    if (summarySound) await summarySound.stopAsync();
    setIsPlayingSummary(false);

    if (!narrativeSound) {
      if (locationData) {
        playAudio(locationData.narrative, 'narrative', setNarrativeSound, setIsNarrativeLoading, setIsPlayingNarrative);
      }
      return;
    }

    if (isPlayingNarrative) {
      await narrativeSound.pauseAsync();
      setIsPlayingNarrative(false);
    } else {
      await narrativeSound.playAsync();
      setIsPlayingNarrative(true);
    }
  };

  const handlePlayPauseSummary = async () => {
    if (narrativeSound) await narrativeSound.stopAsync();
    setIsPlayingNarrative(false);

    if (!summarySound) {
      if (locationData) {
        playAudio(locationData.summary, 'summary', setSummarySound, setIsSummaryLoading, setIsPlayingSummary);
      }
      return;
    }

    if (isPlayingSummary) {
      await summarySound.pauseAsync();
      setIsPlayingSummary(false);
    } else {
      await summarySound.playAsync();
      setIsPlayingSummary(true);
    }
  };

  const createLocationAlert = async (locationData: LocationData) => {
    if (!user) return;

    try {
      const alertData = {
        user_id: user.id,
        title: `New Story: ${locationData.name}`,
        message: `Discover the fascinating story of ${locationData.name}. Rated ${locationData.rating}/5 stars!`,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: 100,
        alert_type: 'story',
        is_read: false,
      };

      const { error } = await supabase
        .from('location_alerts')
        .insert([alertData]);

      if (error) {
        console.error('Error creating location alert:', error);
      } else {
        console.log('Location alert created successfully');
      }
    } catch (error) {
      console.error('Error creating location alert:', error);
    }
  };

  const fetchEmergencyAlertsForLocation = async (lat: number, lng: number) => {
    if (!user) return;

    // Check if we need to fetch alerts for this location
    if (lastAlertLocation) {
      const distance = getDistance(
        lastAlertLocation.latitude,
        lastAlertLocation.longitude,
        lat,
        lng
      );
      console.log(`Distance from last alert location: ${distance} meters`);
      if (distance < 1000) { // Only fetch new alerts if moved more than 1km
        return;
      }
    }

    try {
      console.log(`Fetching emergency alerts for lat: ${lat}, lng: ${lng}`);
      
      // This would call the same emergency alert fetching logic from notifications screen
      // For now, we'll create a simple emergency check
      const mockEmergencyAlert = {
        user_id: user.id,
        title: '🚨 Location Safety Check',
        message: `Emergency alert check completed for your new location. Stay safe and be aware of your surroundings.`,
        latitude: lat,
        longitude: lng,
        radius: 5000,
        alert_type: 'location',
        is_read: false,
      };

      const { error } = await supabase
        .from('location_alerts')
        .insert([mockEmergencyAlert]);

      if (error) {
        console.error('Error creating emergency alert:', error);
      } else {
        console.log('Emergency alert created for new location');
        setLastAlertLocation({ latitude: lat, longitude: lng });
        // Update unread count
        checkUnreadAlerts();
      }
    } catch (error) {
      console.error('Error fetching emergency alerts:', error);
    }
  };

  const checkUnreadAlerts = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('location_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error checking unread alerts:', error);
      } else {
        setUnreadAlertsCount(count || 0);
      }
    } catch (error) {
      console.error('Error checking unread alerts:', error);
    }
  };

  const initialize = async () => {
    try {
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
      
      // Wait for narrative generation to complete
      await generateLocationNarrative(location.coords.latitude, location.coords.longitude);
      
      // Automatically fetch emergency alerts for new location (don't wait for this)
      fetchEmergencyAlertsForLocation(location.coords.latitude, location.coords.longitude);
      
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error('Error during initialization:', error);
      Alert.alert('Error', 'Failed to initialize location services.');
    } finally {
      setLoading(false); // Always set loading to false when done
    }
  };

  useEffect(() => {
    initialize();
    checkUnreadAlerts(); // Check for unread alerts on mount

    return () => {
      narrativeSound?.unloadAsync();
      summarySound?.unloadAsync();
    };
  }, []);

  // Realtime subscription for unread alerts count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`location_alerts_realtime_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'location_alerts', filter: `user_id=eq.${user.id}` },
        () => {
          // Recompute the unread count whenever alerts change
          checkUnreadAlerts();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
      });

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Sparkles size={32} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.title}>GeoTeller</Text>
            </View>
            <Text style={styles.subtitle}>{t('home.subtitle', 'Discover the stories around you')}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <LanguageSwitcher showText={false} iconSize={20} />
            <TouchableOpacity 
              style={styles.notificationButton} 
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color="#FFFFFF" strokeWidth={2} />
              {unreadAlertsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
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
              onPress={(e) => {
                try {
                  // This is a workaround for a potential iOS crash.
                } catch (err) {
                  console.warn("Error in map press:", err);
                }
              }}
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                <View style={styles.audioControlsContainer}>
                  {/* Full Story Audio Control */}
                  <View style={styles.audioControl}>
                    <Text style={styles.audioControlTitle}>Full Story</Text>
                    <TouchableOpacity style={styles.audioButton} onPress={handlePlayPauseNarrative} disabled={isNarrativeLoading}>
                      {isNarrativeLoading ? (
                        <ActivityIndicator color="#8B5CF6" />
                      ) : (
                        isPlayingNarrative ? <Pause size={24} color="#8B5CF6" /> : <Play size={24} color="#8B5CF6" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Summary Audio Control */}
                  <View style={styles.audioControl}>
                    <Text style={styles.audioControlTitle}>AI Summary</Text>
                    <TouchableOpacity style={styles.audioButton} onPress={handlePlayPauseSummary} disabled={isSummaryLoading}>
                      {isSummaryLoading ? (
                        <ActivityIndicator color="#8B5CF6" />
                      ) : (
                        isPlayingSummary ? <Pause size={24} color="#8B5CF6" /> : <Play size={24} color="#8B5CF6" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

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
    backgroundColor: '#F3F4F6',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  mapContainer: {
    height: height * 0.25,
    borderRadius: 24,
    marginHorizontal: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: -height * 0.05, // Overlap with content below
    zIndex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingTop: height * 0.05, // Adjust for map overlap
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    padding: 20,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    letterSpacing: 0.3,
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
    fontSize: 26,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
    letterSpacing: 0.3,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rating: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  visitTime: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  audioControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 16,
  },
  audioControl: {
    alignItems: 'center',
    gap: 10,
  },
  audioControlTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#4B5563',
  },
  audioButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  narrative: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 28,
    marginBottom: 28,
    textAlign: 'left',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  highlightsContainer: {
    marginVertical: 28,
    width: '100%',
  },
  highlightsTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  highlightBullet: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  highlightBulletText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  highlightText: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
    lineHeight: 26,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    marginTop: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    gap: 12,
  },
  shareText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.3,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    marginTop: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderWidth: 2,
    borderColor: '#6B7280',
    gap: 12,
  },
  refreshText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  enableButton: {
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  enableButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
