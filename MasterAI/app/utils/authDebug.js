import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAuthData = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem('userToken'),
      AsyncStorage.removeItem('userData'),
      AsyncStorage.removeItem('lastSignInMethod'),
    ]);
    console.log('✅ All auth data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear auth data:', error);
    return false;
  }
};

export const debugAuthData = async () => {
  try {
    const [token, userData, lastMethod] = await Promise.all([
      AsyncStorage.getItem('userToken'),
      AsyncStorage.getItem('userData'),
      AsyncStorage.getItem('lastSignInMethod'),
    ]);

    console.log('🔍 Debug Auth Data:');
    console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('User Data:', userData ? JSON.parse(userData) : 'null');
    console.log('Last Method:', lastMethod);

    // Check if token is valid JWT format
    if (token) {
      const tokenParts = token.split('.');
      console.log('Token format valid:', tokenParts.length === 3 ? '✅' : '❌');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
          console.log('Token expires:', new Date(payload.exp * 1000));
        } catch (e) {
          console.log('Failed to decode token payload');
        }
      }
    }

    return { token, userData, lastMethod };
  } catch (error) {
    console.error('Failed to debug auth data:', error);
    return null;
  }
};

// Global debug functions for development
if (__DEV__) {
  global.clearAuthData = clearAllAuthData;
  global.debugAuthData = debugAuthData;
}