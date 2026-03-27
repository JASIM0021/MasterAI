import { useRef } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const adUnitId = 'ca-app-pub-4304822949261068/4233877253';

const BannerTest = ({ bannerAdSize, bottom }) => {
  const bannerRef = useRef();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottom ? bottom : 20,
        left: 0,
        right: 0,
      }}
    >
      <BannerAd
        ref={bannerRef}
        unitId={adUnitId}
        size={Platform.OS === 'web' ? 'FULL_BANNER' : BannerAdSize.FULL_BANNER}
        onPaid={event => {
          console.log(
            `Paid: ${event.value} ${event.currency} (precision ${event.precision})`,
          );
        }}
      />
    </View>
  );
};
const CollapsibleBannerTest = () => {
  return (
    <View>
      <BannerAd
        unitId={adUnitId}
        size={
          Platform.OS === 'web'
            ? 'ANCHORED_ADAPTIVE_BANNER'
            : BannerAdSize.ANCHORED_ADAPTIVE_BANNER
        }
        requestOptions={{
          networkExtras: {
            collapsible: 'top',
          },
        }}
      />
    </View>
  );
};

export default {
  CollapsibleBannerTest,
  BannerTest,
};
