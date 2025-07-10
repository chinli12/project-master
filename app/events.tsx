import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { Plus, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string;
  created_by: string;
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (data) {
        setEvents(data);
      }
    };

    fetchEvents();
  }, []);

  const renderItem = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => router.push({ pathname: '/event-details', params: { event: JSON.stringify(item) } })}>
      <ImageBackground
        source={{ uri: item.image_url || `https://picsum.photos/seed/${item.id}/400/200` }}
        style={styles.eventImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.overlay}>
          <View style={styles.dateContainer}>
            <Text style={styles.eventDate}>{item.date}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{item.name}</Text>
            <View style={styles.timeContainer}>
              <Clock size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.eventTime}>{item.time}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.createEventButton}
            onPress={() => router.push('/create-event')}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createEventButtonText}>Create Event</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  eventCard: {
    height: 200,
    marginBottom: 16,
  },
  eventImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
