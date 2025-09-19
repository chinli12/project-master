import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  Dimensions, 
  ScrollView, 
  ActivityIndicator,
  ImageStyle,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { styles as placeStyles } from './_PlaceDetailsScreen.styles';
import { 
  MapPin, 
  Star, 
  Clock, 
  ChevronLeft, 
  Phone, 
  Globe, 
  Route, 
  Share, 
  Heart, 
  Camera, 
  Navigation 
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Polyline, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

// Types
interface Place {
  title: string;
  image?: string;
  rating?: number;
  formatted_phone_number?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  website?: string;
  photos?: Array<{ photo_reference: string }>;
  reviews?: Array<{
    author_name: string;
    profile_photo_url: string;
    rating: number;
    relative_time_description: string;
    text: string;
  }>;
  formatted_address?: string;
  editorial_summary?: {
    overview: string;
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface PlaceDetailsResponse {
  result: Place;
}

interface DirectionsResponse {
  routes: Array<{
    overview_polyline: {
      points: string;
    };
    legs: Array<{
      distance: { text: string };
      duration: { text: string };
    }>;
  }>;
}

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const { width, height } = Dimensions.get('window');

export default function PlaceDetailsScreen() {
  const { id, item } = useLocalSearchParams<{ id: string; item: string }>();
  const place: Place = JSON.parse(item);
  const router = useRouter();
  const [details, setDetails] = useState<Place | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<LocationCoords[]>([]);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const mapRef = useRef<MapView>(null);



  const fetchPlaceDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=name,rating,formatted_phone_number,opening_hours,website,photo,review,formatted_address,editorial_summary,geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      const json = await response.json() as PlaceDetailsResponse;
      setDetails(json.result);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch place details.');
    } finally {
      setLoading(false);
    }
  };

  const getDirections = async (start: LocationCoords, end: LocationCoords) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const json = await response.json() as DirectionsResponse;
      if (json.routes.length > 0) {
        const route = json.routes[0];
        const points = polyline.decode(route.overview_polyline.points);
        const coords = points.map(point => ({
          latitude: point[0],
          longitude: point[1],
        }));
        setPolylineCoords(coords);
        setDistance(route.legs[0].distance.text);
        setDuration(route.legs[0].duration.text);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get directions.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const currentLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setUserLocation(currentLocation);
      
      if (details?.geometry?.location) {
        getDirections(currentLocation, {latitude: details.geometry.location.lat, longitude: details.geometry.location.lng});
      }
    };

    if(details) {
        initialize();
    }
  }, [details]);

  useEffect(() => {
    fetchPlaceDetails();
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Image source={{ uri: place.image }} style={styles.heroImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.heroOverlay}
      />
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Heart 
            size={20} 
            color={isFavorite ? "#EF4444" : "#FFFFFF"} 
            fill={isFavorite ? "#EF4444" : "transparent"}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Share size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Camera size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Place Info Card */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{place.title}</Text>
          <View style={styles.ratingContainer}>
            <Star size={16} color="#FBBF24" fill="#FBBF24" />
            <Text style={styles.rating}>{place.rating}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {details?.opening_hours && (
            <View style={[{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 6,
              borderRadius: 6,
              backgroundColor: details.opening_hours.open_now ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              marginRight: 8
            }]}>
              <Clock size={14} color={details.opening_hours.open_now ? "#10B981" : "#EF4444"} />
              <Text style={{
                marginLeft: 4,
                fontSize: 12,
                color: details.opening_hours.open_now ? "#10B981" : "#EF4444"
              }}>
                {details.opening_hours.open_now ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        {details?.formatted_address && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.address} numberOfLines={1}>
              {details.formatted_address}
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginVertical: 16,
          paddingVertical: 12,
          backgroundColor: '#F9FAFB',
          borderRadius: 12
        }}>
          <TouchableOpacity style={styles.actionButton}>
            <Navigation size={20} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>
          {details?.formatted_phone_number && (
            <TouchableOpacity style={styles.actionButton}>
              <Phone size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {details?.website && (
            <TouchableOpacity style={styles.actionButton}>
              <Globe size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Website</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderContent = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Description Section */}
      {details?.editorial_summary && (
        <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>About This Place</Text>
          <View style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            padding: 16
          }}>
            <Text style={{ color: '#4B5563', lineHeight: 22 }}>{details.editorial_summary.overview}</Text>
          </View>
        </View>
      )}

      {/* Map Section */}
      <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
        <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>Location</Text>
        <View style={styles.mapContainer}>
          {details?.geometry?.location ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}

              mapType="standard"
              loadingEnabled={true}
              loadingIndicatorColor="#666666"
              loadingBackgroundColor="#eeeeee"
              onPress={(e) => {
                try {
                  // This is a workaround for a potential iOS crash.
                } catch (err) {
                  console.warn("Error in map press:", err);
                }
              }}
            >
              <Marker
                coordinate={{
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                }}
                title={place.title}
                description={details.formatted_address}
              />
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Your Location"
                  pinColor="blue"
                />
              )}
              {polylineCoords.length > 0 && (
                <Polyline
                  coordinates={polylineCoords}
                  strokeWidth={4}
                  strokeColor="#8B5CF6"
                />
              )}
            </MapView>
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          )}
        </View>
      </View>

      {/* Photos Section */}
      {details?.photos && (
        <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>Photos ({details.photos.length})</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{
              marginTop: 8
            }}
          >
            {details.photos.map((photo: any, index: number) => (
              <TouchableOpacity 
                key={photo.photo_reference} 
                onPress={() => setSelectedImage(index)}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  marginRight: 12,
                  overflow: 'hidden'
                }}
              >
                <Image
                  source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}` }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8
                  }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reviews Section */}
      {details?.reviews && details.reviews.length > 0 && (
        <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionHeader, { marginBottom: 12 }]}>Reviews ({details.reviews.length})</Text>
          {details.reviews.slice(0, 3).map((review: any, index: number) => (
            <View 
              key={index} 
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}
            >
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Image 
                  source={{ uri: review.profile_photo_url }} 
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 12
                  }} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 4 }}>{review.author_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={14} 
                        color={i < review.rating ? "#FBBF24" : "#E5E7EB"} 
                        fill={i < review.rating ? "#FBBF24" : "transparent"}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                    <Text style={{ marginLeft: 8, color: '#6B7280', fontSize: 12 }}>
                      {review.relative_time_description}
                    </Text>
                  </View>
                </View>
              </View>
              <Text 
                style={{ 
                  color: '#4B5563', 
                  lineHeight: 20,
                  fontSize: 14
                }} 
                numberOfLines={3}
              >
                {review.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  if (loading && !details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading place details...</Text>
      </View>
    );
  }

  const error = null; // Assuming error state is managed elsewhere or not needed
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: '#EF4444', marginBottom: 16, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{
            backgroundColor: '#8B5CF6',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderContent()}
        </ScrollView>
      </SafeAreaView>

      {/* Photo Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <FlatList
            data={details?.photos || []}
            keyExtractor={(item) => item.photo_reference}
            horizontal
            pagingEnabled
            initialScrollIndex={selectedImage || 0}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image
                source={{
                  uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${item.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`,
                }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
        right: 0,
        height: 300,
      },
      header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 16,
        zIndex: 10,
        width: '100%',
      },
      backButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 23,
        padding: 4,
      },
      headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
      },
      headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Inter-Bold',
        flex: 1,
        marginLeft: 12,
      },
      headerActions: {
        flexDirection: 'row',
        gap: 8,
      },
      headerButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      },
      // Map styles
      mapContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        backgroundColor: '#F3F4F6',
      },
      map: {
        ...StyleSheet.absoluteFillObject,
      },
      mapLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        minHeight: 200,
      },
      // Loading states
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#8B5CF6',
      },
      loadingContent: {
        alignItems: 'center',
      },
      loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 16,
      },
      // Modal styles
      modalContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 24,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalCloseText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Poppins-Regular',
      },

      fullscreenImage: {
        width: width,
        height: height * 0.8,
        resizeMode: 'contain',
      },
      bottomPadding: {
        height: 120,
      },
      // Section styles
      section: {
        marginBottom: 24,
        paddingHorizontal: 16,
      },
      sectionTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#1F2937',
        marginBottom: 12,
      },
      sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
      // Quick actions
      quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
      },
      quickActionButton: {
        alignItems: 'center',
        padding: 8,
      },
      quickActionText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
      },
      // Info item styles
      infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
      },
      infoText: {
        fontSize: 14,
        color: '#4B5563',
        marginLeft: 8,
        flex: 1,
      },
      // Expanded image styles
      expandedImage: {
        width: width,
        height: height,
        resizeMode: 'contain',
      },
      glassButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        marginTop: 16,
      },
      // Header section
      headerContainer: {
        position: 'relative',
        height: 300,
      },
      heroImage: {
        width: '100%',
        height: '100%',
      },
      heroOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      actionButtons: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
      },
      actionButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      },
      // Place info card
      content: {
        backgroundColor: '#FFFFFF',
        margin: 24,
        marginTop: -40,
        borderRadius: 28,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 28,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.08)',
      },
      titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
      },
      title: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 16,
        letterSpacing: 0.3,
      },
      ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
      },
      rating: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#FBBF24',
      },
      address: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
        flex: 1,
      },
      actionButtonText: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        color: '#8B5CF6',
        marginTop: 6,
        letterSpacing: 0.2,
      },
      sectionHeader: {
        fontSize: 20,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
        marginBottom: 16,
        letterSpacing: 0.3,
      },
      ratingText: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#FBBF24',
      },
      statusContainer: {
        marginBottom: 20,
      },
      statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
      },
      openBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
      },
      closedBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
      },
      statusText: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        letterSpacing: 0.2,
      },
      openText: {
        color: '#10B981',
      },
      closedText: {
        color: '#EF4444',
      },
      locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      },
      addressText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
        flex: 1,
      },
      // Content sections
      contentContainer: {
        paddingHorizontal: 24,
      },
      description: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#374151',
        lineHeight: 24,
        letterSpacing: 0.2,
      },
      // Photos section
      photosContainer: {
        paddingLeft: 0,
      },
      photoThumbnail: {
        width: 120,
        height: 120,
        borderRadius: 16,
        marginRight: 12,
        backgroundColor: '#E5E7EB',
      },
      // Reviews section
      reviewCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.08)',
      },
      reviewHeader: {
        flexDirection: 'row',
        marginBottom: 12,
      },
      reviewerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.2)',
      },
      reviewerInfo: {
        flex: 1,
      },
      reviewerName: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: 0.2,
      },
      reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      reviewDate: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: '#9CA3AF',
        marginLeft: 8,
      },
      reviewText: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#374151',
        lineHeight: 22,
        letterSpacing: 0.2,
      },


      photoModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      // Legacy styles (keeping for compatibility)
      image: {
        width: '100%',
        height: 300,
      },
      card: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        margin: 16,
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      metaContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
      },
      metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      },
      metaText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: 'rgba(255, 255, 255, 0.8)',
      },
      contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      },
      contactText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: 'rgba(255, 255, 255, 0.8)',
      },
      photo: {
        width: 150,
        height: 150,
        borderRadius: 8,
        marginRight: 12,
      },
      reviewItem: {
        flexDirection: 'row',
      },
      reviewContent: {
        flex: 1,
     },
      closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
      },
      closeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
      },
      safeArea: {
        flex: 1,
backgroundColor: '#F3F4F6',
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        paddingBottom: 120, // Space for the floating CTA button
      },
    });
