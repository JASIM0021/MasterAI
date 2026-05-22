

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
import { RNPushService } from './app/service/notificationService.js';

// Import app open ad service
import { getAppOpenAdService } from './app/service/appOpenAdService.js';

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
    RNPushService.initialize();
    return () => RNPushService.unsubscribe();
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
