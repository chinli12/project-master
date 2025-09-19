import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Bell, 
  MapPin, 
  Users, 
  MessageSquare,
  Camera,
  Globe,
  Smartphone
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  location_sharing: boolean;
  activity_status: boolean;
  message_requests: boolean;
  photo_tagging: boolean;
  search_visibility: boolean;
  analytics_sharing: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    location_sharing: true,
    activity_status: true,
    message_requests: true,
    photo_tagging: true,
    search_visibility: true,
    analytics_sharing: false,
    push_notifications: true,
    email_notifications: true,
    marketing_emails: false,
  });

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching privacy settings:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Save to database
    setSaving(true);
    try {
      const { error } = await supabase
        .from('privacy_settings')
        .upsert(
          {
            user_id: user?.id,
            ...newSettings,
          },
          {
            onConflict: 'user_id'
          }
        );

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating privacy settings:', error.message);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
      // Revert the change
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileVisibilityChange = () => {
    const options = [
      { label: 'Public', value: 'public' },
      { label: 'Friends Only', value: 'friends' },
      { label: 'Private', value: 'private' },
    ];

    Alert.alert(
      'Profile Visibility',
      'Choose who can see your profile',
      options.map(option => ({
        text: option.label,
        onPress: () => updateSetting('profile_visibility', option.value),
        style: settings.profile_visibility === option.value ? 'default' : 'cancel',
      }))
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onToggle, 
    type = 'switch' 
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    value: boolean | string;
    onToggle: () => void;
    type?: 'switch' | 'button';
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onToggle}
      disabled={saving}
    >
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: '#374151', true: '#8B5CF6' }}
          thumbColor={value ? '#FFFFFF' : '#9CA3AF'}
          disabled={saving}
        />
      ) : (
        <View style={styles.settingValue}>
          <Text style={styles.settingValueText}>
            {typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#1F2937', '#111827']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1F2937', '#111827']} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings & Privacy</Text>
          <View style={styles.headerRight}>
            {saving && <ActivityIndicator size="small" color="#8B5CF6" />}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            
            <SettingItem
              icon={<Globe size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Profile Visibility"
              description="Control who can see your profile"
              value={settings.profile_visibility}
              onToggle={handleProfileVisibilityChange}
              type="button"
            />

            <SettingItem
              icon={<MapPin size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Location Sharing"
              description="Share your location with friends"
              value={settings.location_sharing}
              onToggle={() => updateSetting('location_sharing', !settings.location_sharing)}
            />

            <SettingItem
              icon={<Eye size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Activity Status"
              description="Show when you're active"
              value={settings.activity_status}
              onToggle={() => updateSetting('activity_status', !settings.activity_status)}
            />

            <SettingItem
              icon={<Users size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Search Visibility"
              description="Allow others to find you by search"
              value={settings.search_visibility}
              onToggle={() => updateSetting('search_visibility', !settings.search_visibility)}
            />
          </View>

          {/* Communication Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication</Text>
            
            <SettingItem
              icon={<MessageSquare size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Message Requests"
              description="Allow message requests from strangers"
              value={settings.message_requests}
              onToggle={() => updateSetting('message_requests', !settings.message_requests)}
            />

            <SettingItem
              icon={<Camera size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Photo Tagging"
              description="Allow others to tag you in photos"
              value={settings.photo_tagging}
              onToggle={() => updateSetting('photo_tagging', !settings.photo_tagging)}
            />
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <SettingItem
              icon={<Bell size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Push Notifications"
              description="Receive push notifications on your device"
              value={settings.push_notifications}
              onToggle={() => updateSetting('push_notifications', !settings.push_notifications)}
            />

            <SettingItem
              icon={<Smartphone size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Email Notifications"
              description="Receive notifications via email"
              value={settings.email_notifications}
              onToggle={() => updateSetting('email_notifications', !settings.email_notifications)}
            />

            <SettingItem
              icon={<Shield size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Marketing Emails"
              description="Receive promotional emails"
              value={settings.marketing_emails}
              onToggle={() => updateSetting('marketing_emails', !settings.marketing_emails)}
            />
          </View>

          {/* Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Analytics</Text>
            
            <SettingItem
              icon={<Lock size={20} color="#8B5CF6" strokeWidth={2.5} />}
              title="Analytics Sharing"
              description="Share usage data to improve the app"
              value={settings.analytics_sharing}
              onToggle={() => updateSetting('analytics_sharing', !settings.analytics_sharing)}
            />
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  settingValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
  },
  settingValueText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
