import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Keyboard, FlatList, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Navigation, Clock, Route, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import polyline from '@mapbox/polyline';
import { BlurView } from 'expo-blur';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface PlacesAutocompleteResponse {
  predictions: PlacesSuggestion[];
  status: string;
}

// Types for Google Directions API
interface Point {
  latitude: number;
  longitude: number;
}

interface Distance {
  text: string;
  value: number;
}

interface Duration {
  text: string;
  value: number;
}

interface Location {
  lat: number;
  lng: number;
}

interface Leg {
  distance: Distance;
  duration: Duration;
  end_location: Location;
  start_location: Location;
}

interface Route {
  overview_polyline: {
    points: string;
  };
  legs: Leg[];
}

interface DirectionsResponse {
  routes: Route[];
  status: string;
}

interface PlacesSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function DirectionsScreen() {
  const router = useRouter();
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [originInput, setOriginInput] = useState('Current Location');
  const [destinationInput, setDestinationInput] = useState('');
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacesSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = async (query: string) => {
    if (!API_KEY || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}&types=establishment|geocode`
      );
      const data = (await response.json()) as PlacesAutocompleteResponse;
      
      if (data.predictions) {
        setSuggestions(data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDestinationChange = (text: string) => {
    setDestinationInput(text);
    setShowSuggestions(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  const selectSuggestion = (suggestion: PlacesSuggestion) => {
    setDestinationInput(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const getDirections = async (start: { latitude: number; longitude: number }, end: string) => {
    if (!API_KEY) {
      Alert.alert('Error', 'Google Maps API key not configured.');
      return;
    }
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end}&key=${API_KEY}`
      );
      const json = (await response.json()) as DirectionsResponse;
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
    setShowSuggestions(false);
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
        provider={PROVIDER_GOOGLE}
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
          <View style={styles.destinationContainer}>
            <TextInput
              style={styles.input}
              placeholder="Destination"
              value={destinationInput}
              onChangeText={handleDestinationChange}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.place_id}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <MapPin size={16} color="#FFFFFF" style={styles.suggestionIcon} />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText}>
                          {suggestion.structured_formatting.main_text}
                        </Text>
                        <Text style={styles.suggestionSecondaryText}>
                          {suggestion.structured_formatting.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
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
  destinationContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  suggestionSecondaryText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});
