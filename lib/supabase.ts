import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill for structuredClone in React Native
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = function<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Try to import SecureStore, fallback to AsyncStorage if not available
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
  console.log('SecureStore available, using secure storage');
} catch (error) {
  console.log('SecureStore not available, falling back to AsyncStorage');
}

// Custom storage adapter with fallback and better error handling
const createStorageAdapter = () => {
  if (SecureStore) {
    // Use SecureStore if available
    return {
      getItem: async (key: string) => {
        try {
          const item = await SecureStore.getItemAsync(key);
          if (__DEV__) {
            console.log(`SecureStore getItem for key '${key}':`, item ? 'found' : 'not found');
          }
          return item;
        } catch (error) {
          console.error('Error reading from SecureStore:', error);
          // Fallback to AsyncStorage on error
          try {
            const fallbackItem = await AsyncStorage.getItem(key);
            if (__DEV__) {
              console.log(`Fallback to AsyncStorage for key '${key}':`, fallbackItem ? 'found' : 'not found');
            }
            return fallbackItem;
          } catch (fallbackError) {
            console.error('Fallback AsyncStorage also failed:', fallbackError);
            return null;
          }
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
          if (__DEV__) {
            console.log(`SecureStore setItem for key '${key}': success`);
          }
        } catch (error) {
          console.error('Error writing to SecureStore:', error);
          // Fallback to AsyncStorage on error
          try {
            await AsyncStorage.setItem(key, value);
            if (__DEV__) {
              console.log(`Fallback AsyncStorage setItem for key '${key}': success`);
            }
          } catch (fallbackError) {
            console.error('Fallback AsyncStorage setItem failed:', fallbackError);
          }
        }
      },
      removeItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
          if (__DEV__) {
            console.log(`SecureStore removeItem for key '${key}': success`);
          }
        } catch (error) {
          console.error('Error removing from SecureStore:', error);
          // Fallback to AsyncStorage on error
          try {
            await AsyncStorage.removeItem(key);
            if (__DEV__) {
              console.log(`Fallback AsyncStorage removeItem for key '${key}': success`);
            }
          } catch (fallbackError) {
            console.error('Fallback AsyncStorage removeItem failed:', fallbackError);
          }
        }
      },
    };
  } else {
    // Fallback to AsyncStorage
    return {
      getItem: async (key: string) => {
        try {
          const item = await AsyncStorage.getItem(key);
          if (__DEV__) {
            console.log(`AsyncStorage getItem for key '${key}':`, item ? 'found' : 'not found');
          }
          return item;
        } catch (error) {
          console.error('Error reading from AsyncStorage:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await AsyncStorage.setItem(key, value);
          if (__DEV__) {
            console.log(`AsyncStorage setItem for key '${key}': success`);
          }
        } catch (error) {
          console.error('Error writing to AsyncStorage:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          await AsyncStorage.removeItem(key);
          if (__DEV__) {
            console.log(`AsyncStorage removeItem for key '${key}': success`);
          }
        } catch (error) {
          console.error('Error removing from AsyncStorage:', error);
        }
      },
    };
  }
};

const storageAdapter = createStorageAdapter();

// Initialize Supabase client with environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key. Please check your environment variables.');
}

// Configure Supabase client with storage adapter
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
    flowType: 'pkce',
    debug: __DEV__,
  },
});

// Get the linking URI for OAuth redirects
const redirectUrl = Linking.createURL('auth/callback');

// Handle OAuth redirects
const handleOpenURL = async (event: { url: string }) => {
  try {
    console.log('handleOpenURL called with:', event.url);
    if (event.url && event.url.includes('auth/callback')) {
      console.log('Processing auth callback URL');
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session after redirect:', error);
      } else if (data?.session) {
        console.log('Successfully retrieved session after redirect');
      }
    }
  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
  }
};

// Add event listener for deep linking
const subscription = Linking.addEventListener('url', handleOpenURL);

// Set up WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Initialize WebBrowser for OAuth
const initWebBrowser = async () => {
  try {
    await WebBrowser.warmUpAsync();
    
    // Set up a listener for the initial URL in case the app was opened from a deep link
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      console.log('Initial URL detected:', initialUrl);
      await handleOpenURL({ url: initialUrl });
    }
  } catch (error) {
    console.error('Error initializing WebBrowser:', error);
  }
};

// Run the initialization
initWebBrowser();

// Clean up function to be called when needed
export const cleanupAuth = () => {
  if (subscription && typeof subscription.remove === 'function') {
    subscription.remove();
  }
  WebBrowser.coolDownAsync().catch(console.error);
};

// Export the cleanup function for use in your app
export default supabase;
