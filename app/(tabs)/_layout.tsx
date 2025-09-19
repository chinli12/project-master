import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Compass, Users, Calendar, User, Chrome as Home } from 'lucide-react-native';

import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const updateUserStatus = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        updateUserStatus();
      }
      appState.current = nextAppState;
    });

    const interval = setInterval(() => {
      if (appState.current === 'active') {
        updateUserStatus();
      }
    }, 60000); // Every minute

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
        updateUserStatus();
      }
    });

    return () => {
      channel.unsubscribe();
      subscription.remove();
      clearInterval(interval);
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: 'rgba(115, 115, 115, 0.7)',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderTopWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          elevation: 0,
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
        tabBarIconStyle: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={120}
            tint="light"
            style={{
              ...Platform.select({
                ios: {
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                },
                android: {
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                },
              }),
              flex: 1,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: 1,
              borderTopColor: 'rgba(139, 92, 246, 0.1)',
            }}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ backgroundColor: focused ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderRadius: 20, padding: 8 }}>
              <Home size={28} color={color} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ backgroundColor: focused ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderRadius: 20, padding: 8 }}>
              <Compass size={28} color={color} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ backgroundColor: focused ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderRadius: 20, padding: 8 }}>
              <Users size={28} color={color} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ backgroundColor: focused ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderRadius: 20, padding: 8 }}>
              <Calendar size={28} color={color} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={{ backgroundColor: focused ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderRadius: 20, padding: 8 }}>
              <User size={28} color={color} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
