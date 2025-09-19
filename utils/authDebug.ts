import { supabase } from '@/lib/supabase';

export const debugAuth = async () => {
  console.log('=== AUTH DEBUG START ===');
  
  try {
    // Check environment variables
    console.log('Environment check:');
    console.log('- SUPABASE_URL exists:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('- SUPABASE_ANON_KEY exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    // Check storage
    console.log('\nStorage check:');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('- Session data:', {
        hasSession: !!sessionData.session,
        sessionError: sessionError?.message || 'none',
        userId: sessionData.session?.user?.id || 'none'
      });
    } catch (error) {
      console.log('- Session fetch failed:', error);
    }
    
    // Check user
    console.log('\nUser check:');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('- User data:', {
        hasUser: !!userData.user,
        userError: userError?.message || 'none',
        userId: userData.user?.id || 'none'
      });
    } catch (error) {
      console.log('- User fetch failed:', error);
    }
    
    // Test connection
    console.log('\nConnection test:');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      console.log('- Database connection:', error ? 'failed' : 'success');
      if (error) console.log('- DB Error:', error.message);
    } catch (error) {
      console.log('- Database test failed:', error);
    }
    
  } catch (error) {
    console.log('Debug failed:', error);
  }
  
  console.log('=== AUTH DEBUG END ===');
};

export const clearAuthStorage = async () => {
  console.log('Clearing auth storage...');
  try {
    await supabase.auth.signOut();
    console.log('Auth storage cleared successfully');
  } catch (error) {
    console.log('Failed to clear auth storage:', error);
  }
};
