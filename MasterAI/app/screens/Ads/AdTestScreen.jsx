import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  TestIds,
  AdEventType,
  RewardedAdEventType,
  AppOpenAd,
  InterstitialAd,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedInterstitialAd,
  useInterstitialAd,
  useRewardedAd,
  AdsConsent,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';

// Import our app open ad service for testing
import { getAppOpenAdService } from '../../service/appOpenAdService.js';
import AppOpenAdComponent from './AppOpenAd.jsx';

const styles = StyleSheet.create({
  testSpacing: {
    marginBottom: 20,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
});

const AppOpenTest = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [appOpen, setAppOpen] = useState(null);

  useEffect(() => {
    const ad = AppOpenAd.createForAdRequest(TestIds.APP_OPEN, {
      requestNonPersonalizedAdsOnly: true,
    });

    const adListener = ad.addAdEventsListener(({ type, payload }) => {
      console.log(`${Platform.OS} app open ad event: ${type}`);
      if (type === AdEventType.PAID) {
        console.log(payload);
      }
      if (type === AdEventType.ERROR) {
        console.log(`${Platform.OS} app open error: ${payload?.message}`);
      }
      if (type === AdEventType.LOADED) {
        setAdLoaded(true);
      }
    });

    setAppOpen(ad);

    return () => {
      adListener();
    };
  }, []);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>Original App Open Test (Direct API)</Text>
      <Button
        title="Load App Open Ad"
        onPress={() => {
          try {
            appOpen?.load();
          } catch (e) {
            console.log(`${Platform.OS} app open load error: ${e}`);
          }
        }}
      />
      <Text>Loaded? {adLoaded ? 'true' : 'false'}</Text>
      <Button
        title="Show App Open Ad"
        onPress={() => {
          try {
            appOpen?.show();
          } catch (e) {
            console.log(`${Platform.OS} app open show error: ${e}`);
          }
        }}
      />
    </View>
  );
};

// Enhanced App Open Test using our service
const AppOpenServiceTest = () => {
  const [serviceStatus, setServiceStatus] = useState({});
  const [appOpenAdService] = useState(() => getAppOpenAdService());

  const updateStatus = () => {
    setServiceStatus(appOpenAdService.getStatus());
  };

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>App Open Service Test (Our Implementation)</Text>
      <Text style={styles.statusText}>
        Status: {JSON.stringify(serviceStatus, null, 2)}
      </Text>
      <Button
        title="Show Ad via Service"
        onPress={async () => {
          const success = await appOpenAdService.showAd();
          console.log('Manual show result:', success);
          updateStatus();
        }}
      />
      <Button
        title="Get Status"
        onPress={updateStatus}
      />
    </View>
  );
};

// App Open Component Test
const AppOpenComponentTest = () => {
  const [showComponent, setShowComponent] = useState(false);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>App Open Component Test</Text>
      <Button
        title="Show App Open Component"
        onPress={() => setShowComponent(true)}
      />
      <Button
        title="Hide Component"
        onPress={() => setShowComponent(false)}
      />
      <AppOpenAdComponent
        visible={showComponent}
        testMode={true}
        onAdShown={() => console.log('Component: Ad shown')}
        onAdDismissed={() => {
          console.log('Component: Ad dismissed');
          setShowComponent(false);
        }}
        onAdFailedToLoad={(error) => console.log('Component: Ad failed to load', error)}
        onAdFailedToShow={(error) => console.log('Component: Ad failed to show', error)}
      />
    </View>
  );
};

const InterstitialTest = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [interstitial, setInterstitial] = useState(null);

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);

    const adListener = ad.addAdEventsListener(({ type, payload }) => {
      console.log(`${Platform.OS} interstitial ad event: ${type}`);
      if (type === AdEventType.PAID) {
        console.log('Paid', payload);
      }
      if (type === AdEventType.ERROR) {
        console.log(`${Platform.OS} interstitial error: ${payload?.message}`);
      }
      if (type === AdEventType.LOADED) {
        setAdLoaded(true);
      }
    });

    setInterstitial(ad);

    return () => {
      adListener();
    };
  }, []);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>Interstitial Test</Text>
      <Button
        title="Load Interstitial"
        onPress={() => {
          try {
            interstitial?.load();
          } catch (e) {
            console.log(`${Platform.OS} interstitial load error: ${e}`);
          }
        }}
      />
      <Text>Loaded? {adLoaded ? 'true' : 'false'}</Text>
      <Button
        title="Show Interstitial"
        onPress={() => {
          try {
            interstitial?.show();
          } catch (e) {
            console.log(`${Platform.OS} interstitial show error: ${e}`);
          }
        }}
      />
    </View>
  );
};

const BannerTest = ({ bannerAdSize }) => {
  const bannerRef = useRef();

  return (
    <View>
      <BannerAd
        ref={bannerRef}
        unitId={
          bannerAdSize.includes('ADAPTIVE_BANNER')
            ? TestIds.ADAPTIVE_BANNER
            : TestIds.BANNER
        }
        size={bannerAdSize}
        onPaid={(event) => {
          console.log(
            `Paid: ${event.value} ${event.currency} (precision ${event.precision})`,
          );
        }}
      />
      <Button
        title="Reload"
        onPress={() => {
          bannerRef.current?.load();
        }}
      />
    </View>
  );
};

const CollapsibleBannerTest = () => {
  return (
    <View>
      <BannerAd
        unitId={TestIds.ADAPTIVE_BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          networkExtras: {
            collapsible: 'top',
          },
        }}
      />
    </View>
  );
};

const RewardedTest = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [rewarded, setRewarded] = useState(null);

  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(TestIds.REWARDED, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['fashion', 'clothing'],
    });

    const adListener = ad.addAdEventsListener(({ type, payload }) => {
      console.log(`${Platform.OS} rewarded ad event: ${type}`);
      if (type === AdEventType.PAID) {
        console.log(payload);
      }
      if (type === AdEventType.ERROR) {
        console.log(
          `${Platform.OS} rewarded error: ${(payload).message}`,
        );
      }
      if (type === RewardedAdEventType.LOADED) {
        setAdLoaded(true);
      }
    });

    setRewarded(ad);

    return () => {
      adListener();
    };
  }, []);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>Rewarded Test</Text>
      <Button
        title="Load Rewarded"
        onPress={() => {
          try {
            rewarded?.load();
          } catch (e) {
            console.log(`${Platform.OS} rewarded load error: ${e}`);
          }
        }}
      />
      <Text>Loaded? {adLoaded ? 'true' : 'false'}</Text>
      <Button
        title="Show Rewarded"
        onPress={() => {
          try {
            rewarded?.show();
          } catch (e) {
            console.log(`${Platform.OS} rewarded show error: ${e}`);
          }
        }}
      />
    </View>
  );
};

const RewardedInterstitialTest = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [rewardedInterstitial, setRewardedInterstitial] = useState(null);

  useEffect(() => {
    const ad = RewardedInterstitialAd.createForAdRequest(
      TestIds.REWARDED_INTERSTITIAL,
      {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['fashion', 'clothing'],
      },
    );

    const adListener = ad.addAdEventsListener(
      ({ type, payload }) => {
        console.log(`${Platform.OS} rewarded interstitial ad event: ${type}`);
        if (type === AdEventType.PAID) {
          console.log(payload);
        }
        if (type === AdEventType.ERROR) {
          console.log(
            `${Platform.OS} rewarded interstitial error: ${
              (payload).message
            }`,
          );
        }
        if (type === RewardedAdEventType.LOADED) {
          setAdLoaded(true);
        }
      },
    );

    setRewardedInterstitial(ad);

    return () => {
      adListener();
    };
  }, []);

  return (
    <View style={styles.testSpacing}>
      <Text style={styles.testTitle}>Rewarded Interstitial Test</Text>
      <Button
        title="Load Rewarded Interstitial"
        onPress={() => {
          try {
            rewardedInterstitial?.load();
          } catch (e) {
            console.log(
              `${Platform.OS} rewarded interstitial load error: ${e}`,
            );
          }
        }}
      />
      <Text>Loaded? {adLoaded ? 'true' : 'false'}</Text>
      <Button
        title="Show Rewarded Interstitial"
        onPress={() => {
          try {
            rewardedInterstitial?.show();
          } catch (e) {
            console.log(`${Platform.OS} rewarded interstitial show error: ${e}`);
          }
        }}
      />
    </View>
  );
};

const AdConsentTest = () => {
  return (
    <View style={styles.testSpacing}>
      <Button
        title="Show Consent Form"
        onPress={async () => {
          const consentInfo = await AdsConsent.requestInfoUpdate({
            debugGeography: AdsConsentDebugGeography.EEA,
            testDeviceIdentifiers: [],
          });

          if (consentInfo.isConsentFormAvailable) {
            await AdsConsent.showForm();

            const choices = await AdsConsent.getUserChoices();

            console.log(JSON.stringify(choices, null, 2));
          }
        }}
      />
      <Text>
        This test case will not work with the test App ID. You must configure
        your real App ID in app.json and the Consent Form in AdMob/Ad Manager.
        If you are running this test on a device instead of an emulator and if
        you are currently not located in EEA, you have to add your Decive ID
        to the testDeviceIdentifiers of this test case as well.
      </Text>
    </View>
  );
};

const InterstitialHookTest = () => {
  const { load, show, error, isLoaded, isClicked, isClosed, isOpened, revenue } =
    useInterstitialAd(TestIds.INTERSTITIAL);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (error !== undefined) {
      console.log(`${Platform.OS} interstitial hook error: ${error.message}`);
    }
  }, [error]);

  useEffect(() => {
    if (isLoaded) {
      console.log(`${Platform.OS} interstitial ad loaded`);
    }
  }, [isLoaded]);

  return (
    <View style={styles.testSpacing}>
      <Button title="Load Interstitial" onPress={load} />
      <Text>Loaded? {isLoaded ? 'true' : 'false'}</Text>
      <Button title="Show Interstitial" onPress={show} />
    </View>
  );
};

const RewardedHookTest = () => {
  const { load, show, error, isLoaded, isClicked, isClosed, isOpened, revenue } =
    useRewardedAd(TestIds.REWARDED);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (error !== undefined) {
      console.log(`${Platform.OS} rewarded hook error: ${error.message}`);
    }
  }, [error]);

  useEffect(() => {
    if (isLoaded) {
      console.log(`${Platform.OS} rewarded ad loaded`);
    }
  }, [isLoaded]);

  return (
    <View style={styles.testSpacing}>
      <Button title="Load Rewarded" onPress={load} />
      <Text>Loaded? {isLoaded ? 'true' : 'false'}</Text>
      <Button title="Show Rewarded" onPress={show} />
    </View>
  );
};

const AdTestScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.testTitle}>🧪 Ad Testing Dashboard</Text>

        {/* App Open Ad Tests - Our New Implementation */}
        <View style={{backgroundColor: '#e8f5e8', padding: 10, borderRadius: 5, marginBottom: 20}}>
          <Text style={[styles.testTitle, {color: '#2d7d2d'}]}>🚀 App Open Ads (New Implementation)</Text>
          <AppOpenServiceTest />
          <AppOpenComponentTest />
          <AppOpenTest />
        </View>

        {/* Other Ad Tests */}
        <View style={{backgroundColor: '#f0f8ff', padding: 10, borderRadius: 5, marginBottom: 20}}>
          <Text style={[styles.testTitle, {color: '#1e90ff'}]}>📱 Other Ad Types</Text>
          <InterstitialTest />
          <BannerTest bannerAdSize={BannerAdSize.FULL_BANNER} />
          <CollapsibleBannerTest />
          <RewardedTest />
          <RewardedInterstitialTest />
        </View>

        {/* Hook-based Tests */}
        <View style={{backgroundColor: '#fff8f0', padding: 10, borderRadius: 5, marginBottom: 20}}>
          <Text style={[styles.testTitle, {color: '#ff8c00'}]}>🪝 Hook-based Tests</Text>
          <InterstitialHookTest />
          <RewardedHookTest />
        </View>

        {/* Consent Test */}
        <View style={{backgroundColor: '#f8f0ff', padding: 10, borderRadius: 5, marginBottom: 20}}>
          <Text style={[styles.testTitle, {color: '#8a2be2'}]}>⚖️ Consent Management</Text>
          <AdConsentTest />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdTestScreen;
