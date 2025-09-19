import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { ChevronLeft, Calendar, Clock, MapPin, Users, Share, Heart, MoreHorizontal } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const { event: eventString } = useLocalSearchParams();
  const event = JSON.parse(eventString as string);
  const router = useRouter();
  const [isAttending, setIsAttending] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [attendees, setAttendees] = useState(event.attendees_count || 0);

  useEffect(() => {
    const fetchEventDetails = async () => {
      // Only fetch from database if we have a real event ID (not mock data)
      if (event.id && event.id !== '1' && event.id !== '2' && event.id !== '3') {
        const { data: attendeesData, error: attendeesError } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        if (!attendeesError && attendeesData !== null) {
          setAttendees(attendeesData);
        }

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
      } else {
        // For mock events, use the attendees_count from the event object
        setAttendees(event.attendees_count || 156);
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

  const handleShare = () => {
    Alert.alert('Share Event', 'Share this event with your friends!');
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      
      {/* Header with Navigation */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.glassButton}>
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.glassButton}>
              <Share size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorite} style={styles.glassButton}>
              <Heart 
                size={20} 
                color={isFavorite ? "#EF4444" : "#FFFFFF"} 
                fill={isFavorite ? "#EF4444" : "transparent"}
                strokeWidth={2.5} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.glassButton}>
              <MoreHorizontal size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Hero Image Section */}
          <View style={styles.heroSection}>
            <ImageBackground
              source={{ uri: event.image_url || `https://picsum.photos/seed/${event.id}/400/200` }}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.heroOverlay}
              >
                <View style={styles.heroContent}>
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.heroTitle}>{event.name}</Text>
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <Users size={16} color="#FFFFFF" />
                      <Text style={styles.heroStatText}>{attendees} attending</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Event Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Calendar size={20} color="#8B5CF6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailText}>
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Clock size={20} color="#8B5CF6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailText}>{event.time}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <MapPin size={20} color="#8B5CF6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailText}>{event.location}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.aboutCard}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Attendees Section */}
          <View style={styles.attendeesCard}>
            <View style={styles.attendeesHeader}>
              <Text style={styles.sectionTitle}>Attendees ({attendees})</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.attendeesList}>
              {/* Mock attendees avatars */}
              {[1, 2, 3, 4, 5].map((_, index) => (
                <Image
                  key={index}
                  source={{ uri: `https://picsum.photos/seed/user${index}/100/100` }}
                  style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -12 : 0 }]}
                />
              ))}
              <View style={styles.moreAttendees}>
                <Text style={styles.moreAttendeesText}>+{Math.max(0, attendees - 5)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.attendButton, isAttending && styles.attendingButton]} 
            onPress={handleAttend}
          >
            <LinearGradient
              colors={isAttending ? ['#10B981', '#059669'] : ['#8B5CF6', '#7C3AED']}
              style={styles.attendButtonGradient}
            >
              <Text style={styles.attendButtonText}>
                {isAttending ? '✓ Attending' : 'Attend Event'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: 300,
    marginBottom: 24,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroContent: {
    gap: 12,
  },
  eventBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  eventBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 38,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  detailsList: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  detailText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  attendeesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    letterSpacing: 0.2,
  },
  attendeesList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreAttendees: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreAttendeesText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  bottomPadding: {
    height: 120,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  attendButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  attendingButton: {
    shadowColor: '#10B981',
  },
  attendButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
});
