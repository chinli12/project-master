import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star, Clock, ChevronLeft, Phone, Globe, Route } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

const GOOGLE_PLACES_API_KEY = 'AIzaSyArQQgKA4uz4bwoz4l2THPNVCOlususLFc';
const { width, height } = Dimensions.get('window');

export default function PlaceDetailsScreen() {
  const { id, item } = useLocalSearchParams();
  const place = JSON.parse(item as string);
  const router = useRouter();
  const [details, setDetails] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchPlaceDetails = async () => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=name,rating,formatted_phone_number,opening_hours,website,photo,review,formatted_address,editorial_summary,geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      const json = await response.json();
      setDetails(json.result);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch place details.');
    }
  };

  const getDirections = async (start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const json = await response.json();
      if (json.routes.length > 0) {
        const route = json.routes[0];
        const points = polyline.decode(route.overview_polyline.points);
        const coords = points.map(point => ({
          latitude: point[0],
          longitude: point[1],
        }));
        setPolylineCoords(coords);
        
        const leg = route.legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);

        mapRef.current?.fitToCoordinates([start, end], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
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
    <>
      <Image source={{ uri: place.image }} style={styles.image} />
      <View style={styles.card}>
        <Text style={styles.title}>{place.title}</Text>
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Star size={16} color="#FFD700" />
            <Text style={styles.metaText}>{place.rating}</Text>
          </View>
          {details?.opening_hours && (
            <View style={styles.metaItem}>
              <Clock size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.metaText}>{details.opening_hours.open_now ? 'Open' : 'Closed'}</Text>
            </View>
          )}
        </View>
        {details?.editorial_summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{details.editorial_summary.overview}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          {details?.formatted_phone_number && (
            <View style={styles.contactItem}>
              <Phone size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.contactText}>{details.formatted_phone_number}</Text>
            </View>
          )}
          {details?.website && (
            <View style={styles.contactItem}>
              <Globe size={16} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.contactText}>{details.website}</Text>
            </View>
          )}
        </View>

        {details?.photos && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <FlatList
              data={details.photos}
              keyExtractor={(item) => item.photo_reference}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity onPress={() => setSelectedImage(index)}>
                  <Image
                    source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photo_reference}&key=${GOOGLE_PLACES_API_KEY}` }}
                    style={styles.photo}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
        {details?.reviews && <Text style={styles.sectionTitle}>Reviews</Text>}
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={['#2c3e50', '#3498db']}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={details?.reviews || []}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <BlurView intensity={80} tint="dark" style={styles.reviewCard}>
              <View style={styles.reviewItem}>
                <Image source={{ uri: item.profile_photo_url }} style={styles.reviewerAvatar} />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewerName}>{item.author_name}</Text>
                  <Text style={styles.reviewText}>{item.text}</Text>
                </View>
              </View>
            </BlurView>
          )}
        />
        {selectedImage !== null && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={selectedImage !== null}
            onRequestClose={() => setSelectedImage(null)}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <FlatList
                data={details.photos}
                keyExtractor={(item) => item.photo_reference}
                horizontal
                pagingEnabled
                initialScrollIndex={selectedImage}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference=${item.photo_reference}&key=${GOOGLE_PLACES_API_KEY}` }}
                    style={styles.expandedImage}
                  />
                )}
              />
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 1,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 23,
    padding: 4,
  },
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
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
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
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 16,
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
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reviewItem: {
    flexDirection: 'row',
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewContent: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  reviewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
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
  expandedImage: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
  mapSection: {
    margin: 16,
  },
  map: {
    height: 200,
    borderRadius: 20,
  },
  directionsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});
