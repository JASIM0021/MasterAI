

import { decode, encode } from 'base-64';

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}
import { LogBox, SafeAreaView, useColorScheme, Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { Provider as PaperProvider } from 'react-native-paper';
import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigation from './app/Navigations/AuthNavigation.js';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './app/features/Store.js';

import { useDispatch } from 'react-redux';
import { darkTheme, lightTheme } from './app/themes/index.js';

import mobileAds from 'react-native-google-mobile-ads';
import BottomTabs from './app/screens/Tabs/bottomTabs.jsx';
// import useCodePush from './app/CodePush/useCodePush.js';

// Import authentication components
import AuthInitializer from './app/Components/auth/AuthInitializer.jsx';
import { RNPushService, registerNotificationCategories } from './app/service/notificationService.js';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './app/navigation/navigationRef.js';

// Import app open ad service
import { getAppOpenAdService } from './app/service/appOpenAdService.js';

// Show notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Import auth debug utility in development
if (__DEV__) {
  require('./app/utils/authDebug.js');
}

mobileAds()
  .initialize()
  .then(() => {
    console.log('AdMob initialized');
    // Start app open ad service after AdMob is ready
    getAppOpenAdService().initAsync();
  })
  .catch(e => console.warn('AdMob init failed:', e));

LogBox.ignoreAllLogs();

//-------------------------------------//
export default function App() {
  const [user, setUser] = useState(null);
  const [loader, setLoader] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Register notification categories (action buttons) before any notification fires
    registerNotificationCategories();
    RNPushService.initialize();

    // Handle taps on notification action buttons
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data || {};
      const { type, postId, deepLink } = data;

      if (type === 'post_approval') {
        if (actionIdentifier === 'approve_and_share') {
          if (navigationRef?.current?.isReady()) {
            navigationRef.current.navigate('ApprovePost', { postId, autoApprove: true });
          }
        } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          if (navigationRef?.current?.isReady()) {
            navigationRef.current.navigate('ApprovePost', { postId });
          }
        }
        // 'dismiss' — notification already dismissed, no navigation needed
      }
    });

    return () => {
      RNPushService.unsubscribe();
      responseSub.remove();
    };
  }, []);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  return (
    // <GestureHandlerRootView style={{ flex: 1 }}>

    <Provider store={store}>
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <AuthInitializer>
            <SystemBars style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <NavigationContainer ref={navigationRef}>
              {/* <AuthNavigation />
              progress || syncMessage ? (
              <CodePushLoading progress={progress} subHeader={syncMessage} />
              ) : ( */}
              <BottomTabs />
              
            </NavigationContainer>
          </AuthInitializer>
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>

    // </GestureHandlerRootView>
  );
}
