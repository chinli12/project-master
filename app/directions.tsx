import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Navigation, Clock, Route } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import polyline from '@mapbox/polyline';
import { BlurView } from 'expo-blur';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function DirectionsScreen() {
  const router = useRouter();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [originInput, setOriginInput] = useState('Current Location');
  const [destinationInput, setDestinationInput] = useState('Universal Studios Hollywood');
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const getDirections = async (start: { latitude: number; longitude: number }, end: string) => {
    if (!API_KEY) {
      Alert.alert('Error', 'Google Maps API key not configured.');
      return;
    }
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end}&key=${API_KEY}`
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

        const endLocation = leg.end_location;
        const newDestination = { latitude: endLocation.lat, longitude: endLocation.lng };
        setDestination(newDestination);

        mapRef.current?.fitToCoordinates([start, newDestination], {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        });

      } else {
        Alert.alert('Error', 'No routes found. Please check the destination.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get directions.');
    }
  };

  const handleGetDirections = () => {
    Keyboard.dismiss();
    if (!userLocation) {
      Alert.alert('Error', 'Could not get your current location. Please wait a moment and try again.');
      return;
    }
    if (!destinationInput.trim()) {
      Alert.alert('Error', 'Please enter a destination.');
      return;
    }
    getDirections(userLocation, destinationInput);
  };

  useEffect(() => {
    const initialize = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for real-time tracking.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const currentLocation = { latitude, longitude };
      setUserLocation(currentLocation);
      
      getDirections(currentLocation, destinationInput);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setUserLocation({ latitude, longitude });
        }
      );
    };

    initialize();
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 34.0,
          longitude: -118.0,
          latitudeDelta: 1.0,
          longitudeDelta: 1.0,
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image source={require('./assets/images/marker.png')} style={styles.userLocationMarker} />
          </Marker>
        )}
        {destination && <Marker coordinate={destination} title="Destination" pinColor="red" />}
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#3498db"
            strokeWidth={6}
          />
        )}
      </MapView>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Directions</Text>
        </View>
        <BlurView intensity={80} tint="dark" style={styles.directionsContainer}>
          {distance && duration && (
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Clock size={18} color="#FFFFFF" />
                <Text style={styles.infoText}>{duration}</Text>
              </View>
              <View style={styles.infoItem}>
                <Route size={18} color="#FFFFFF" />
                <Text style={styles.infoText}>{distance}</Text>
              </View>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Origin"
            value={originInput}
            editable={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            value={destinationInput}
            onChangeText={setDestinationInput}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
          />
          <TouchableOpacity style={styles.getDirectionsButton} onPress={handleGetDirections}>
            <Navigation size={20} color="#FFFFFF" />
            <Text style={styles.getDirectionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </BlurView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  directionsContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  getDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  getDirectionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
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
  userLocationMarker: {
    width: 40,
    height: 40,
  },
});
