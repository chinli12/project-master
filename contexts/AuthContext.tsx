import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/chatService';
import { Alert } from 'react-native';
import { Subscription } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('AuthContext - Fetching profile for user:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('AuthContext - Profile fetch error:', profileError);
        return null;
      }
      console.log('AuthContext - Profile data fetched:', profileData);
      return profileData;
    } catch (error) {
      console.error('AuthContext - Error fetching profile:', error);
      return null;
    }
  }, []);

  const updateAuthState = useCallback(async (session: Session | null) => {
    console.log('AuthContext - Updating auth state:', { hasSession: !!session, userId: session?.user?.id });
    
    setSession(session);
    setUser(session?.user || null);
    
    if (session?.user) {
      const profileData = await fetchProfile(session.user.id);
      setProfile(profileData);
    } else {
      setProfile(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    let authSubscription: { subscription: Subscription } | null = null;
    let isMounted = true;

    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log('AuthContext - Auth state changed:', { event, hasSession: !!session });
      
      if (!isMounted) return;
      
      await updateAuthState(session);
    };

    const initializeAuth = async () => {
      try {
        console.log('AuthContext - Initializing authentication');
        
        // Set up auth state listener first
        const { data } = supabase.auth.onAuthStateChange(handleAuthChange);
        authSubscription = data;
        console.log('AuthContext - Auth state listener set up');
        
        // Get initial session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext - Session initialization error:', sessionError);
        } else {
          console.log('AuthContext - Initial session data:', { 
            hasSession: !!sessionData.session, 
            userId: sessionData.session?.user?.id || 'none' 
          });
          await updateAuthState(sessionData.session);
        }
        
        console.log('AuthContext - Initialization complete');
      } catch (error) {
        console.error('AuthContext - Auth initialization failed:', error);
      } finally {
        if (isMounted) {
          console.log('AuthContext - Setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [updateAuthState]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const contextValue = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }), [session, user, profile, loading, signIn, signUp, signOut, resetPassword]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
