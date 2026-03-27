/**
 * Simple test script to verify authentication persistence
 * Run this in your app to test the new auth system
 */

import tokenManager from '../tokenManager';
import { clearAllAuthData, debugAuthData } from '../authDebug';

export const runAuthTests = async () => {
  console.log('=== Authentication System Tests ===');

  try {
    // Test 1: Clear all data first
    console.log('\n1. Clearing all auth data...');
    await clearAllAuthData();
    await tokenManager.initialize();

    // Test 2: Check initial state
    console.log('\n2. Checking initial state...');
    const isInitiallyAuth = tokenManager.isAuthenticated();
    console.log('Initially authenticated:', isInitiallyAuth);

    // Test 3: Simulate saving token
    console.log('\n3. Simulating token save...');
    const mockUser = {
      id: 'test123',
      name: 'Test User',
      email: 'test@example.com',
      profilePicture: null,
      emailVerified: true,
      authProvider: 'google',
      lastLogin: new Date().toISOString(),
      role: 'user'
    };

    // Create a mock JWT token (don't use in production!)
    const mockToken = createMockJWT(mockUser);

    const saveResult = await tokenManager.saveToken(mockToken, mockUser, 'google');
    console.log('Token saved successfully:', saveResult);

    // Test 4: Check authentication after save
    console.log('\n4. Checking authentication after save...');
    const isAuthAfterSave = tokenManager.isAuthenticated();
    console.log('Authenticated after save:', isAuthAfterSave);

    // Test 5: Test token manager reinitialization
    console.log('\n5. Testing reinitialization...');
    const newTokenManager = require('../tokenManager').default;
    await newTokenManager.initialize();

    const isAuthAfterReinit = newTokenManager.isAuthenticated();
    console.log('Authenticated after reinit:', isAuthAfterReinit);

    // Test 6: Debug info
    console.log('\n6. Debug information...');
    await debugAuthData();
    const debugInfo = await tokenManager.debugInfo();
    console.log('TokenManager debug:', debugInfo);

    // Test 7: Test token expiry logic
    console.log('\n7. Testing token expiry...');
    const isExpired = tokenManager.isTokenExpired();
    console.log('Token expired:', isExpired);

    console.log('\n=== All Tests Completed ===');
    return true;

  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
};

// Helper function to create a mock JWT (for testing only!)
function createMockJWT(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
  };

  // In a real app, this would be properly signed by your backend
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock_signature_for_testing_only';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Export for use in debug mode
if (__DEV__) {
  global.runAuthTests = runAuthTests;
  global.testTokenManager = tokenManager;
}

export default runAuthTests;