

import { decode, encode } from 'base-64';

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}
import { LogBox, SafeAreaView, StatusBar, useColorScheme, Platform } from 'react-native';
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
import { RNPushService } from './app/service/notificationService.js';

// Import app open ad service
import { getAppOpenAdService } from './app/service/appOpenAdService.js';

// Import auth debug utility in development
if (__DEV__) {
  require('./app/utils/authDebug.js');
}

// mobileAds()
//   .initialize()
//   .then(adapterStatuses => {
//     // Initialization complete!
//     console.log('AdMob initialized:', adapterStatuses);

//     // Initialize app open ad service after AdMob is ready
//     const appOpenAdService = getAppOpenAdService();
//     console.log('App Open Ad service initialized');

//     // Trigger first ad load and display for app launch
//     console.log('Triggering initial app open ad load');
//   });

LogBox.ignoreAllLogs();

//-------------------------------------//
export default function App() {
  const [user, setUser] = useState(null);
  const [loader, setLoader] = useState(false);
  const [token, setToken] = useState('');

  // useEffect(() => {
  //   getToken();
  // }, []);
  useEffect(() => {
    // Initialize push notifications
    RNPushService.initialize()

    return () => {
      // Clean up on unmount
      RNPushService.unsubscribe();
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
            <StatusBar
              animated={true}
              backgroundColor={Platform.OS === 'android' ? 'transparent' : (
                colorScheme === 'dark'
                  ? darkTheme.colors.background
                  : lightTheme.colors.background
              )}
              barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
              translucent={Platform.OS === 'android'}
              showHideTransition="slide"
              hidden={false}
            />
            <NavigationContainer>
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
