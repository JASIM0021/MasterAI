import * as React from 'react';
import { BottomNavigation, Text } from 'react-native-paper';
import AuthNavigation from '../../Navigations/AuthNavigation';
import SocialAutomateNavigation from '../../Navigations/SocialAutomateNavigation';
import Guardian from '../Guardian/Guardian';
import GuardianScreen from '../Guardian/GuardianScreen';
import UserProfile from '../Profile/UserProfile';
import TabComponent from './CustomTabs';
import { getFCMToken, registerAppWithFCM } from '../../service/notificationService';
import { useRegisterNotificationMutation } from '../../features/api/creditsApiSlice';
import tokenManager from '../../utils/tokenManager';

const AIToolsRoute = () => <AuthNavigation />;

const AutomateSocialRoute = () => <SocialAutomateNavigation />;

const AIGuardianRoute = () => <GuardianScreen />;

const ProfileRoute = () => <UserProfile />;

const BottomTabs = () => {
  const [index, setIndex] = React.useState(0);

  const [registerFCM] = useRegisterNotificationMutation();
  const [routes] = React.useState([
    {
      key: 'ai-tools',
      title: 'AI Tools',
      focusedIcon: 'robot',
      unfocusedIcon: 'robot-outline',
    },
    {
      key: 'automate-social',
      title: 'Automate Social',
      focusedIcon: 'share',
      unfocusedIcon: 'share-outline',
    },
    // {
    //   key: 'ai-guardian',
    //   title: 'AI Guardian',
    //   focusedIcon: 'shield',
    //   unfocusedIcon: 'shield-outline',
    // },
  ]);

  const renderScene = BottomNavigation.SceneMap({
    'ai-tools': AIToolsRoute,
    'automate-social': AutomateSocialRoute,
    'ai-guardian': AIGuardianRoute,
  });
  const tabs = [
    {
      key: 'ai-tools',
      title: 'AI Tools',
      activeIcon: 'robot',
      inactiveIcon: 'robot-outline',
      component: AuthNavigation,
    },
    {
      key: 'automate-social',
      title: 'Automate Social',
      activeIcon: 'share',
      inactiveIcon: 'share-outline',
      component: SocialAutomateNavigation,
    },
    // {
    //   key: 'ai-guardian',
    //   title: 'AI Guardian',
    //   activeIcon: 'shield',
    //   inactiveIcon: 'shield-outline',
    //   component: Guardian,
    // },
    {
      key: 'profile',
      title: 'Profile',
      activeIcon: 'account',
      inactiveIcon: 'account-outline',
      component: UserProfile,
    },
  ];


  React.useEffect(() => {
    // Defer FCM registration to not block the initial render
    const deferredFCMRegistration = async () => {
      try {
        if (__DEV__) console.log('🚀 Starting deferred FCM registration...');

        registerAppWithFCM();

        const fcm = await getFCMToken();
        if (__DEV__) console.log('🔔 FCM token obtained:', fcm?.substring(0, 20) + '...');

        const user = tokenManager.userData();
        if (user?.id && fcm) {
          await registerFCM({
            token: fcm,
            userId: user.id,
            platform: ''
          });
          if (__DEV__) console.log('✅ FCM registration completed successfully');
        } else {
          if (__DEV__) console.log('⚠️ FCM registration skipped - missing user or token');
        }
      } catch (error) {
        if (__DEV__) console.log('❌ FCM registration failed:', error);
      }
    };

    // Delay FCM registration to allow UI to render first
    const timeoutId = setTimeout(deferredFCMRegistration, 2000);

    return () => clearTimeout(timeoutId);
  }, []);

  return <TabComponent tabs={tabs} />;

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
};

export default BottomTabs;
