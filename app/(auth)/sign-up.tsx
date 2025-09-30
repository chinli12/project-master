import React, { useState } from 'react';
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
import { AuthError } from '@supabase/supabase-js';
import { colors, spacing, radii } from '../../styles/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      ModernAlert.error('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      ModernAlert.error('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      ModernAlert.error('Error', 'Password must be at least 8 characters');
      return;
    }

    if (!acceptTerms) {
      ModernAlert.error('Error', 'Please accept the terms and privacy policy');
      return;
    }

    setLoading(true);
    const { error }: { error: AuthError | null } = await signUp(email, password, '');
    setLoading(false);

    if (error) {
      ModernAlert.error('Sign Up Failed', error.message);
    } else {
      ModernAlert.success(
        'Success',
        'Account created successfully! Please check your email to verify your account.',
        () => router.replace('/(auth)/sign-in')
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Layered gradients to match reference (top-only bluish blend into #F2F2F2) */}
      <LinearGradient
        colors={[ '#AFC2D6', '#E4ECF3', '#F2F2F2' ]}
        locations={[0, 0.32, 1]}
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
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Create your account</Text>
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
                  style={[styles.inputGradient, emailFocused && styles.inputFocused]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
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
                  style={[styles.passwordGradient, passwordFocused && styles.inputFocused]}
                >
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password (8+ characters)"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#9CA3AF" />
                      ) : (
                        <Eye size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <LinearGradient
                  colors={["#D6E6F3", "#F9FBFD"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.passwordGradient, confirmFocused && styles.inputFocused]}
                >
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password (8+ characters)"
                      placeholderTextColor={colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#9CA3AF" />
                      ) : (
                        <Eye size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>

              {/* Terms and Privacy */}
              <TouchableOpacity 
                style={styles.termsContainer}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I accept the <Text style={styles.termsLink}>terms</Text> and{' '}
                  <Text style={styles.termsLink}>privacy policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Continue Button */}
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  acceptTerms && !loading ? styles.continueButtonActive : styles.continueButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={loading || !acceptTerms}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
                  <Text style={styles.signInLink}>Login here</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <Text style={styles.dividerText}>or continue with</Text>
              </View>

              {/* Social Buttons */}
              <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.socialButton}>
                  <Image
                    source={require('../../assets/images/logo google.png')}
                    style={styles.socialIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Image
                    source={require('../../assets/images/Logo.svg.png')}
                    style={styles.socialIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    pointerEvents: 'none',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  titleContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
    color: '#2D2D2D',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: '#374151',
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textAlign: 'left',
    color: colors.textPrimary,
    paddingTop: 16,
    paddingRight: 12,
    paddingBottom: 16,
    paddingLeft: 12,
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
    gap: 10,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textAlign: 'left',
    color: colors.textPrimary,
    paddingTop: 16,
    paddingRight: 12,
    paddingBottom: 16,
    paddingLeft: 12,
    height: 48,
  },
  eyeButton: {
    padding: 12,
    marginRight: 8,
  },
  // Gradient wrappers for inputs to match mock
  inputGradient: {
    borderRadius: 8,
    padding: 0,
    opacity: 1,
    width: 343,
    alignSelf: 'center',
    height: 48,
  },
  passwordGradient: {
    borderRadius: 8,
    padding: 0,
    width: 343,
    alignSelf: 'center',
    height: 48,
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: colors.lightGreen,
    borderRadius: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.primary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    width: 343,
    height: 56,
    borderRadius: 12,
    paddingTop: 20,
    paddingRight: 32,
    paddingBottom: 20,
    paddingLeft: 32,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  continueButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#5DB302',
  },
  continueButtonDisabled: {
    backgroundColor: colors.disabled,
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontFamily: 'Raleway-Medium',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0.4,
    textAlign: 'center',
    color: colors.surface,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  signInText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  socialButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
});
