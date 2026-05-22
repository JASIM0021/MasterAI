// import { registerRootComponent } from 'expo';

import { AppRegistry } from 'react-native';
import App from './App';
import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import { showLocalNotificationFromData } from './app/service/notificationService';

// Must be registered at module level — runs when app is killed/backgrounded
messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage?.data) {
    await showLocalNotificationFromData(remoteMessage.data);
  }
});

// registerRootComponent(App);
export default registerRootComponent(App);
