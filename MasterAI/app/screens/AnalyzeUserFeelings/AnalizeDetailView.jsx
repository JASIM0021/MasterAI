import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { Text, useTheme, Button, IconButton } from 'react-native-paper';
import { responsiveHeight, responsiveWidth } from '../../themes';
import Header from '../../Components/header/Header';
import ViewShot from 'react-native-view-shot';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { LinearGradient } from 'expo-linear-gradient';
import Share from 'react-native-share';
import apiconstant from '../../Constant/apiconstant';
const { width, height } = Dimensions.get('window');

const AnalizeDetailView = ({ route }) => {
  const { data } = route.params;
  const viewShotRef = useRef();

  console.log('data2', data?.data?.sentiment);
  const theme = useTheme();
  const emojiAnimations = useRef(
    Array(10)
      .fill()
      .map(() => new Animated.Value(height)),
  ).current;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      alignItems: 'center',
    },
    imageContainer: {
      width: width * 0.8,
      height: width * 0.8,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    infoContainer: {
      width: '100%',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#ffffff',
    },
    infoText: {
      fontSize: 16,
      marginBottom: 4,
      color: '#ffffff',
    },
    thoughtContainer: {
      width: '100%',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    thoughtTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#ffffff',
    },
    thoughtText: {
      fontSize: 16,
      color: '#ffffff',
      lineHeight: 24,
    },
    emojiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: width * 0.8,
      overflow: 'hidden',
      pointerEvents: 'none',
    },
    shareButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 1,
    },
  });

  useEffect(() => {
    const animations = emojiAnimations.map(animation =>
      Animated.loop(
        Animated.timing(animation, {
          toValue: -100,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ),
    );
    Animated.stagger(200, animations).start();
  }, []);

  const {
    load,
    show,
    error: addError,
    isLoaded,
    isClicked,
    isClosed,
    isOpened,
    revenue,
  } = useInterstitialAd('ca-app-pub-4304822949261068/9793325693');
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isLoaded) {
      console.log(`${Platform.OS} interstitial ad loaded`);
      show();
    }
  }, [isLoaded]);

  const renderEmojis = () => {
    const emojis = data?.data?.sentiment?.includes('positive')
      ? ['😊', '👍', '🎉', '😄', '🌟', '🥳', '💖', '🌈', '🦋', '🌻']
      : ['😔', '👎', '🌧️', '😢', '😞', '💔', '🌩️', '🕸️', '🍂', '🌚'];

    return emojis.map((emoji, index) => (
      <Animated.Text
        key={index}
        style={{
          fontSize: 30,
          position: 'absolute',
          bottom: -50,
          left: Math.random() * (width * 0.8),
          transform: [
            {
              translateY: emojiAnimations[index].interpolate({
                inputRange: [-100, width * 0.8],
                outputRange: [-100, width * 0.8],
              }),
            },
          ],
        }}
      >
        {emoji}
      </Animated.Text>
    ));
  };

  const handleShare = async () => {
    try {
      const uri = await viewShotRef.current.capture();

      const shareOptions = {
        title: 'Capytion',
        message: ` ${data?.data?.feeling} with a ${data?.data?.sentiment} sentiment! Check out my feeling analysis!\n\nDownload the app: ${apiconstant.appUrl}`,
        urls: [uri],
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <LinearGradient colors={['#6200ee', '#9c27b0']} style={styles.container}>
      <Header isBack={true} title="Feeling Analysis" />
      <ViewShot ref={viewShotRef} style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: data?.image }}
            style={styles.image}
            resizeMode="cover"
          />
          <IconButton
            icon="share"
            mode="contained"
            onPress={handleShare}
            style={styles.shareButton}
          />
          <View style={styles.emojiContainer}>{renderEmojis()}</View>
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          style={styles.infoContainer}
        >
          <Text style={styles.infoTitle}>Analysis Results</Text>
          <Text style={styles.infoText}>Feeling: {data?.data?.feeling}</Text>
          <Text style={styles.infoText}>
            Sentiment: {data?.data?.sentiment}
          </Text>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          style={styles.thoughtContainer}
        >
          <Text style={styles.thoughtTitle}>Thought Analysis</Text>
          <Text style={styles.thoughtText}>{data?.data?.thought}</Text>
        </LinearGradient>
      </ViewShot>
    </LinearGradient>
  );
};

export default AnalizeDetailView;
