import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, MapPin, Clock, X, Settings, Trash2, Cloud, Shield, AlertTriangle, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface LocationAlert {
  id: string;
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  created_at: string;
  is_read: boolean;
  alert_type: 'location' | 'proximity' | 'story' | 'emergency' | 'weather' | 'crime' | 'riot' | 'disaster';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source?: string; // API source or news feed
  expires_at?: string; // When the alert expires
}

interface AlertData {
  title: string;
  message: string;
  alert_type: 'location' | 'proximity' | 'story';
  radius: number;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    loadNotifications();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for location alerts.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('location_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        Alert.alert('Error', 'Failed to load notifications.');
      } else {
        setAlerts(data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('location_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) {
        console.error('Error marking as read:', error);
      } else {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        ));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('location_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting alert:', error);
        Alert.alert('Error', 'Failed to delete notification.');
      } else {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const createLocationAlert = async () => {
    if (!userLocation || !user) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    try {
      const newAlert = {
        user_id: user.id,
        title: 'New Location Story Available',
        message: `Discover the fascinating story of your current location!`,
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        radius: 100, // 100 meters
        alert_type: 'location',
        is_read: false,
      };

      const { data, error } = await supabase
        .from('location_alerts')
        .insert([newAlert])
        .select();

      if (error) {
        console.error('Error creating alert:', error);
        Alert.alert('Error', 'Failed to create location alert.');
      } else {
        Alert.alert('Success', 'Location alert created successfully!');
        loadNotifications(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const fetchWeatherAlerts = async (lat: number, lon: number) => {
    const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    if (!OPENWEATHER_API_KEY) {
      console.log('OpenWeatherMap API key not configured');
      return [];
    }

    try {
      // Fetch current weather and alerts from OpenWeatherMap
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      const weatherData = await weatherResponse.json();

      // Fetch weather alerts if available
      const alertsResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&exclude=minutely,hourly,daily`
      );
      const alertsData = await alertsResponse.json();

      const alerts: AlertData[] = [];

      // Process severe weather conditions
      if (weatherData.weather) {
        const mainWeather = weatherData.weather[0];
        const temp = weatherData.main.temp;
        const windSpeed = weatherData.wind?.speed || 0;
        const visibility = weatherData.visibility || 10000;

        // Severe weather conditions
        if (mainWeather.id >= 200 && mainWeather.id < 300) { // Thunderstorms
          alerts.push({
            title: '⛈️ Thunderstorm Warning',
            message: `Severe thunderstorms in your area. ${mainWeather.description}. Seek shelter immediately and avoid outdoor activities.`,
            alert_type: 'story',
            radius: 10000
          });
        }
        
        if (mainWeather.id >= 500 && mainWeather.id < 600 && mainWeather.id !== 500) { // Heavy rain
          alerts.push({
            title: '🌧️ Heavy Rain Alert',
            message: `Heavy rainfall detected: ${mainWeather.description}. Risk of flooding in low-lying areas. Drive carefully and avoid flooded roads.`,
            alert_type: 'story',
            radius: 8000
          });
        }

        if (mainWeather.id >= 600 && mainWeather.id < 700) { // Snow
          alerts.push({
            title: '❄️ Snow Alert',
            message: `Snow conditions: ${mainWeather.description}. Reduced visibility and slippery roads. Drive with caution.`,
            alert_type: 'story',
            radius: 15000
          });
        }

        if (windSpeed > 10) { // High winds (>36 km/h)
          alerts.push({
            title: '💨 High Wind Warning',
            message: `Strong winds detected: ${Math.round(windSpeed * 3.6)} km/h. Secure loose objects and avoid parking under trees.`,
            alert_type: 'proximity',
            radius: 12000
          });
        }

        if (temp > 35) { // Extreme heat
          alerts.push({
            title: '🌡️ Extreme Heat Warning',
            message: `Dangerous heat levels: ${Math.round(temp)}°C. Stay hydrated, seek air conditioning, and limit outdoor activities.`,
            alert_type: 'story',
            radius: 20000
          });
        }

        if (temp < -10) { // Extreme cold
          alerts.push({
            title: '🥶 Extreme Cold Warning',
            message: `Dangerous cold conditions: ${Math.round(temp)}°C. Risk of frostbite and hypothermia. Dress warmly and limit exposure.`,
            alert_type: 'story',
            radius: 20000
          });
        }

        if (visibility < 1000) { // Poor visibility
          alerts.push({
            title: '🌫️ Low Visibility Alert',
            message: `Poor visibility conditions: ${visibility}m. Fog or haze present. Drive slowly and use headlights.`,
            alert_type: 'proximity',
            radius: 5000
          });
        }
      }

      // Process official weather alerts from OpenWeatherMap
      if (alertsData.alerts && alertsData.alerts.length > 0) {
        alertsData.alerts.forEach((alert: any) => {
          alerts.push({
            title: `🚨 ${alert.event}`,
            message: `Official weather alert: ${alert.description}. Source: ${alert.sender_name}`,
            alert_type: 'story',
            radius: 25000
          });
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  };

  const fetchNewsAlerts = async (lat: number, lon: number) => {
    const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;
    if (!NEWS_API_KEY) {
      console.log('NewsAPI key not configured');
      return [];
    }

    try {
      // Get location name for news search
      const locationResponse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const location = locationResponse[0];
      const searchTerms = [
        `${location.city} emergency`,
        `${location.region} disaster`,
        `${location.city} riot`,
        `${location.region} evacuation`,
        `${location.city} fire`,
        `${location.region} flood`
      ];

      const alerts: AlertData[] = [];
      const today = new Date().toISOString().split('T')[0];

      // Search for emergency news in the area
      for (const searchTerm of searchTerms.slice(0, 2)) { // Limit to 2 searches to avoid rate limits
        try {
          const newsResponse = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchTerm)}&from=${today}&sortBy=publishedAt&pageSize=3&apiKey=${NEWS_API_KEY}`
          );
          const newsData = await newsResponse.json();

          if (newsData.articles && newsData.articles.length > 0) {
            newsData.articles.forEach((article: any) => {
              const title = article.title.toLowerCase();
              let alertType: 'location' | 'proximity' | 'story' = 'location';
              let emoji = '📰';
              let radius = 5000;

              // Categorize news alerts
              if (title.includes('fire') || title.includes('wildfire')) {
                emoji = '🔥';
                alertType = 'story';
                radius = 15000;
              } else if (title.includes('flood') || title.includes('storm')) {
                emoji = '🌊';
                alertType = 'story';
                radius = 10000;
              } else if (title.includes('riot') || title.includes('protest')) {
                emoji = '⚠️';
                alertType = 'proximity';
                radius = 3000;
              } else if (title.includes('emergency') || title.includes('evacuation')) {
                emoji = '🚨';
                alertType = 'story';
                radius = 8000;
              }

              alerts.push({
                title: `${emoji} ${article.title.substring(0, 50)}...`,
                message: `Breaking news: ${article.description || article.title}. Source: ${article.source.name}`,
                alert_type: alertType,
                radius: radius
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching news for ${searchTerm}:`, error);
        }
      }

      return alerts.slice(0, 3); // Limit to 3 news alerts
    } catch (error) {
      console.error('Error fetching news alerts:', error);
      return [];
    }
  };

  const fetchEmergencyAlerts = async () => {
    if (!userLocation || !user) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    try {
      const lat = userLocation.coords.latitude;
      const lon = userLocation.coords.longitude;

      // Show loading indicator
      Alert.alert('Fetching Alerts', 'Getting real-time emergency alerts for your area...');

      // Fetch from multiple real APIs
      const [weatherAlerts, newsAlerts] = await Promise.all([
        fetchWeatherAlerts(lat, lon),
        fetchNewsAlerts(lat, lon)
      ]);

      // Combine all alerts
      const allAlerts = [...weatherAlerts, ...newsAlerts];

      // Add fallback mock alerts if no real alerts found
      if (allAlerts.length === 0) {
        allAlerts.push({
          title: '📍 Location Alert',
          message: 'No emergency alerts found for your area. This is good news! Stay safe and check back later.',
          alert_type: 'location',
          radius: 1000
        });
      }

      // Format alerts for database insertion
      const formattedAlerts = allAlerts.map(alert => ({
        user_id: user.id,
        title: alert.title,
        message: alert.message,
        latitude: lat + (Math.random() - 0.5) * 0.01, // Slight random offset
        longitude: lon + (Math.random() - 0.5) * 0.01,
        radius: alert.radius,
        alert_type: alert.alert_type,
        is_read: false,
      }));

      // Insert alerts into database
      const { error } = await supabase
        .from('location_alerts')
        .insert(formattedAlerts);

      if (error) {
        console.error('Error creating emergency alerts:', error);
        Alert.alert('Error', 'Failed to save emergency alerts. Please try again.');
      } else {
        Alert.alert('Success', `${formattedAlerts.length} real-time emergency alerts fetched successfully!`);
        loadNotifications(); // Refresh the list
      }
    } catch (error) {
      console.error('Error fetching emergency alerts:', error);
      Alert.alert('Error', 'Failed to fetch emergency alerts. Please check your internet connection.');
    }
  };

  const getAlertIcon = (type: string, priority: string = 'medium') => {
    const getColor = () => {
      switch (priority) {
        case 'critical': return '#EF4444'; // Red
        case 'high': return '#F59E0B'; // Orange
        case 'medium': return '#8B5CF6'; // Purple
        case 'low': return '#6B7280'; // Gray
        default: return '#8B5CF6';
      }
    };

    const color = getColor();
    
    switch (type) {
      case 'location':
        return <MapPin size={24} color={color} />;
      case 'proximity':
        return <Bell size={24} color={color} />;
      case 'story':
        return <Clock size={24} color={color} />;
      case 'emergency':
        return <Bell size={24} color={color} />;
      case 'weather':
        return <Cloud size={24} color={color} />;
      case 'crime':
        return <Shield size={24} color={color} />;
      case 'riot':
        return <AlertTriangle size={24} color={color} />;
      case 'disaster':
        return <Zap size={24} color={color} />;
      default:
        return <Bell size={24} color={color} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={fetchEmergencyAlerts} style={styles.addButton}>
            <AlertTriangle size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                Create location alerts to get notified about interesting places around you
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={createLocationAlert}>
                <Text style={styles.createButtonText}>Create Location Alert</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {alerts.map((alert) => (
                <View key={alert.id} style={[
                  styles.alertCard, 
                  !alert.is_read && styles.unreadAlert,
                  alert.priority === 'critical' && styles.criticalAlert,
                  alert.priority === 'high' && styles.highAlert
                ]}>
                  <View style={styles.alertHeader}>
                    <View style={[
                      styles.alertIconContainer,
                      alert.priority === 'critical' && styles.criticalIconContainer,
                      alert.priority === 'high' && styles.highIconContainer
                    ]}>
                      {getAlertIcon(alert.alert_type, alert.priority || 'medium')}
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>{formatTime(alert.created_at)}</Text>
                    </View>
                    <View style={styles.alertActions}>
                      {!alert.is_read && (
                        <TouchableOpacity
                          onPress={() => markAsRead(alert.id)}
                          style={styles.markReadButton}
                        >
                          <Text style={styles.markReadText}>Mark Read</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => deleteAlert(alert.id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
    height: height * 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  alertsList: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  criticalAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  highAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  criticalIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  highIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  alertActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  markReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  markReadText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
