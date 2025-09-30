import React, { useState } from 'react';
import Constants from 'expo-constants';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { ModernAlert } from '@/utils/modernAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { debugAuth, clearAuthStorage } from '@/utils/authDebug';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      ModernAlert.error('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Sign-in attempt starting for:', email);
      const { error } = await signIn(email, password);
      
      if (error) {
        let errorMessage = 'An error occurred during sign in. Please try again.';
        
        // Provide more specific error messages based on the error code or message
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email before signing in.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
        }
        
        console.warn('Sign-in failed:', { email, error: error.message });
        ModernAlert.error('Sign In Failed', errorMessage);
      } else {
        console.log('Sign-in successful, redirecting to tabs');
        router.replace('/(tabs)');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Unexpected error during sign in:', errorMessage);
      ModernAlert.error(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient to match sign-up screen */}
      <LinearGradient
        colors={[ '#AFC2D6', '#E4ECF3', '#F2F2F2' ]}
        locations={[0, 0.22, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientFill}
      />
      <LinearGradient
        colors={[ 'rgba(120,145,170,0.28)', 'rgba(120,145,170,0.00)' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.75, y: 0.75 }}
        style={styles.gradientOverlay}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" scrollEnabled={false}>
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                <ChevronLeft size={24} color={'#2D2D2D'} />
              </TouchableOpacity>
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Welcome back 👋</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.inputGroup}> 
                <Text style={styles.label}>Email address</Text>
                <LinearGradient
                  colors={["#D6E6F3", "#F9FBFD"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </LinearGradient>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}> 
                <Text style={styles.label}>Password</Text>
                <LinearGradient
                  colors={["#D6E6F3", "#F9FBFD"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.passwordGradient}
                >
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password (8+ characters)"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      {showPassword ? (
                        <EyeOff size={20} color="#9CA3AF" />
                      ) : (
                        <Eye size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>

              {/* Remember + Forgot */}
              <View style={styles.rowBetween}>
                <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.rememberWrap}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {/* Sign up link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don’t have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
                  <Text style={styles.signUpLink}>Sign up here</Text>
                </TouchableOpacity>
              </View>

              {/* Spacer pushes the divider + socials to the bottom */}
              <View style={styles.flexSpacer} />

              {/* Bottom section: Divider + Socials */}
              <View style={styles.bottomSection}>
                <View style={styles.dividerContainer}>
                  <Text style={styles.dividerText}>or continue with</Text>
                </View>
                <View style={styles.socialContainer}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Image source={require('../../assets/images/logo google.png')} style={styles.socialIcon} resizeMode="contain" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Image source={require('../../assets/images/Logo.svg.png')} style={styles.socialIcon} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2' },
  gradientFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  keyboardView: {
    flex: 1,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  titleWrap: { marginBottom: 24, paddingHorizontal: 8, width: 343, alignSelf: 'center' },
  title: { fontFamily: 'Poppins-SemiBold', fontWeight: '600', fontSize: 24, lineHeight: 24, letterSpacing: 0, color: '#2D2D2D', textAlign: 'left' },
  form: { },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: { marginBottom: 16 },
  label: { fontFamily: 'Poppins-Regular', fontWeight: '400', fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: '#64748B', textAlign: 'left', marginBottom: 8 },
  inputGradient: { borderRadius: 8, width: 343, height: 48, alignSelf: 'center' },
  passwordGradient: { borderRadius: 8, width: 343, height: 48, alignSelf: 'center' },
  input: { flex: 1, fontFamily: 'Poppins-Regular', fontWeight: '400', fontSize: 14, lineHeight: 16, letterSpacing: 0.4, color: '#374151', paddingTop: 16, paddingRight: 12, paddingBottom: 16, paddingLeft: 12, height: 48 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48 },
  passwordInput: { flex: 1, fontFamily: 'Poppins-Regular', fontWeight: '400', fontSize: 14, lineHeight: 16, letterSpacing: 0.4, color: '#374151', paddingTop: 16, paddingRight: 12, paddingBottom: 16, paddingLeft: 12, height: 48 },
  eyeButton: {
    padding: 4,
  },
  rowBetween: { width: 343, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 20 },
  rememberWrap: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxChecked: { backgroundColor: '#8CCF44', borderColor: '#8CCF44' },
  checkmark: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' },
  rememberText: { fontFamily: 'Poppins-Regular', fontWeight: '400', fontSize: 14, lineHeight: 14, letterSpacing: 0, color: '#64748B' },
  forgotText: { fontFamily: 'Poppins-Regular', fontWeight: '400', fontSize: 14, lineHeight: 21, letterSpacing: 0, color: '#374151' },
  continueButton: { backgroundColor: '#8CCF44', width: 343, height: 56, borderRadius: 12, paddingTop: 20, paddingRight: 32, paddingBottom: 20, paddingLeft: 32, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 16 },
  continueButtonText: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.4, lineHeight: 16 },
  signUpContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  signUpText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#6B7280' },
  signUpLink: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#8CCF44' },
  dividerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  dividerText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#6B7280' },
  socialContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingBottom: 32 },
  socialButton: { backgroundColor: 'rgba(255,255,255,0.9)', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  socialIcon: { width: 24, height: 24 },
  flexSpacer: { flexGrow: 1 },
  bottomSection: { marginTop: 48 },
  debugContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  debugTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  debugButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
