import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Alert,
} from 'react-native';
import { ChevronLeft, Calendar, Clock, MapPin } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function EventDetailsScreen() {
  const { event: eventString } = useLocalSearchParams();
  const event = JSON.parse(eventString as string);
  const router = useRouter();
  const [isAttending, setIsAttending] = useState(false);
  const [attendees, setAttendees] = useState(0);

  useEffect(() => {
    const fetchEventDetails = async () => {
      const { data: attendeesData } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact' })
        .eq('event_id', event.id);
      if (attendeesData) setAttendees(attendeesData.length);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: attendeeData } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .single();
        if (attendeeData) setIsAttending(true);
      }
    };

    fetchEventDetails();
  }, [event.id]);

  const handleAttend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be logged in to attend an event.');
      return;
    }

    if (isAttending) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      if (!error) {
        setIsAttending(false);
        setAttendees(attendees - 1);
      }
    } else {
      const { error } = await supabase
        .from('event_attendees')
        .insert({ event_id: event.id, user_id: user.id });
      if (!error) {
        setIsAttending(true);
        setAttendees(attendees + 1);
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView>
          <ImageBackground
            source={{ uri: event.image_url || `https://picsum.photos/seed/${event.id}/400/200` }}
            style={styles.coverImage}
          >
            <View style={styles.overlay}>
              <Text style={styles.eventName}>{event.name}</Text>
            </View>
          </ImageBackground>
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Calendar size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.detailText}>{event.date}</Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.detailText}>{event.time}</Text>
            </View>
            <View style={styles.detailItem}>
              <MapPin size={20} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
            <Text style={styles.description}>{event.description}</Text>
            <TouchableOpacity style={styles.attendButton} onPress={handleAttend}>
              <Text style={styles.attendButtonText}>{isAttending ? 'Attending' : 'Attend Event'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  coverImage: {
    height: 250,
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  eventName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  detailsContainer: {
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    lineHeight: 24,
    marginVertical: 16,
  },
  attendButton: {
    backgroundColor: '#A78BFA',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  attendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});
