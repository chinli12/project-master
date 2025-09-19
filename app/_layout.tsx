import { useEffect, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AlertProvider } from '@/components/ModernAlert';
import i18n from '@/lib/i18n'; // Initialize i18n and get instance
import { I18nextProvider } from 'react-i18next';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_300Light
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_300Light
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Light': Inter_300Light,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // Ensure videos/audio play correctly on iOS (silent switch, mixing)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(console.warn);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <AlertProvider>
          <AuthProvider>
            <ProtectedRoute>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                  animationDuration: 140,
                  contentStyle: { backgroundColor: '#F8FAFC' },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                {/* Ensure smooth transition and consistent background for Post Details */}
                <Stack.Screen
                  name="post-details"
                  options={{
                    headerShown: false,
                    animation: 'none',
                    contentStyle: { backgroundColor: '#F8FAFC' },
                    gestureEnabled: true,
                  }}
                />
                {/* Register call route so router.push('/call/[channel]') works */}
                <Stack.Screen
                  name="call/[channel]"
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: '#000' },
                    gestureEnabled: true,
                  }}
                />
              </Stack>
            </ProtectedRoute>
          </AuthProvider>
        </AlertProvider>
      </I18nextProvider>
      <StatusBar style="auto" backgroundColor="#8B5CF6" />
    </GestureHandlerRootView>
  );
}
