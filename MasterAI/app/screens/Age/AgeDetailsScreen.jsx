import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Text, useTheme, IconButton, Card, Button } from 'react-native-paper';
import Header from '../../Components/header/Header';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import Share from 'react-native-share';
import apiconstant from '../../Constant/apiconstant';
const { width, height } = Dimensions.get('window');
const responsiveWidth = width * 0.25;
const responsiveHeight = height * 0.1;

const AgeDetailsScreen = ({ route }) => {
  const { data } = route.params;
  const theme = useTheme();
  const viewShotRef = useRef();
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
      flex: 1,
      padding: 16,
    },
    card: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    imageContainer: {
      width: '100%',
      height: responsiveWidth * 3.2,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    ageContainer: {
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    ageLabel: {
      fontSize: 18,
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    ageBig: {
      fontSize: 72,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    traditionalAge: {
      fontSize: 20,
      marginTop: 8,
      color: theme.colors.secondary,
    },
    emojiContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: responsiveWidth * 3.2,
      overflow: 'hidden',
      pointerEvents: 'none',
    },
    shareButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    infoContainer: {
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    infoTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: '100%',
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

  const getTraditionalAge = age => {
    if (age < 13) return 'Child';
    if (age < 20) return 'Teenager';
    if (age < 30) return 'Young Adult';
    if (age < 50) return 'Adult';
    if (age < 65) return 'Middle-aged';
    return 'Senior';
  };

  const renderEmojis = () => {
    const emojis = ['👶', '🧒', '🧑', '🧓', '👴', '👵', '🎂', '🕰️', '📅', '🌱'];

    return emojis.map((emoji, index) => (
      <Animated.Text
        key={index}
        style={{
          fontSize: 30,
          position: 'absolute',
          bottom: -50,
          left: Math.random() * (responsiveWidth * 3.2),
          transform: [
            {
              translateY: emojiAnimations[index].interpolate({
                inputRange: [-100, responsiveWidth * 3.2],
                outputRange: [-100, responsiveWidth * 3.2],
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
        message: ` ${getTraditionalAge(data?.data)} at ${
          data?.data
        } years old! Check out my age analysis!\n\nDownload the app: ${
          apiconstant.appUrl
        }`,
        url: uri,
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#4158D0', '#C850C0', '#FFCC70']}
      style={styles.container}
    >
      <Header isBack={true} title="Age Analysis Results" />
      <ScrollView>
        <ViewShot ref={viewShotRef} style={styles.content}>
          <Card style={styles.card}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: data?.image }}
                style={styles.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.gradientBackground}
              />
              <IconButton
                icon="share"
                mode="contained"
                onPress={handleShare}
                style={styles.shareButton}
              />
              <View style={styles.emojiContainer}>{renderEmojis()}</View>
            </View>
            <Card.Content style={styles.ageContainer}>
              <Text style={styles.ageLabel}>Estimated Age</Text>
              <Text style={styles.ageBig}>{data?.data}</Text>
              <Text style={styles.traditionalAge}>
                {getTraditionalAge(data?.data)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Age Analysis</Text>
            <Text style={styles.ageLabel}>
              Based on our advanced AI analysis, we estimate that the person in
              this image is approximately {data?.data} years old. This places
              them in the {getTraditionalAge(data?.data)} age group.
            </Text>
            <Button
              mode="contained"
              onPress={handleShare}
              style={{ marginTop: 16 }}
              icon="share"
            >
              Share My Age Feeling
            </Button>
          </Card>
        </ViewShot>
      </ScrollView>
    </LinearGradient>
  );
};

export default AgeDetailsScreen;
