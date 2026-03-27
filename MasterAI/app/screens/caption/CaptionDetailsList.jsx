import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Card, useTheme, Snackbar, Divider } from 'react-native-paper';
import Header from '../../Components/header/Header';
import { responsiveWidth, responsiveHeight } from '../../themes';
import * as Clipboard from 'expo-clipboard';
import ViewShot from 'react-native-view-shot';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { LinearGradient } from 'expo-linear-gradient';
import { useReportMutation } from '../../features/api/upload/uploadPhoto';
import ReportContentModal from '../../Components/Model/ReportContentModal';

const { width } = Dimensions.get('window');

const CaptionDetailsList = ({ route }) => {
  const theme = useTheme();
  const captions = route.params?.data?.data || [];
  const image = route.params?.data?.image;
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // ... existing state and variables ...
  const viewShotRef = useRef();
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [currentCaptionId, setCurrentCaptionId] = useState(null);
  const [report] = useReportMutation(); //

  const handleReport = async captionId => {
    setCurrentCaptionId(captionId);
    setReportModalVisible(true); // Show the report modal
  };

  const handleSubmitReport = async reportData => {
    console.log(`Report for caption ${currentCaptionId}:`, reportData);
    report(reportData); // Submit the report
    setSnackbarVisible(true);
    setSnackbarMessage(
      `Report for caption ${
        currentCaptionId || Math.random().toString(36).substr(2, 9)
      } submitted.`,
    );
  };
  const {
    load,
    show,
    error,
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContainer: {
      padding: 15,
    },
    card: {
      marginBottom: responsiveHeight * 1.5,
      borderRadius: 16,
      overflow: 'hidden',
      elevation: 5,
    },
    captionImage: {
      width: '100%',
      height: width * 0.8,
      resizeMode: 'cover',
    },
    captionContainer: {
      padding: 10,
    },
    captionText: {
      fontSize: 20,
      fontStyle: 'italic',
      marginVertical: responsiveHeight * 0.3,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 28,
    },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: responsiveHeight * 0.4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      // backgroundColor: theme.colors.primary,
      paddingHorizontal: responsiveWidth * 0.5,
      paddingVertical: responsiveHeight * 0.2,
      borderRadius: 20,
    },
    actionText: {
      marginLeft: 8,
      color: theme.colors.surface,
      fontWeight: 'bold',
    },
  });

  const copyToClipboard = async text => {
    await Clipboard.setStringAsync(text);
    setSnackbarMessage('Caption copied to clipboard');
    setSnackbarVisible(true);
  };

  const shareCaption = async (text, captionImage) => {
    try {
      const uri = await viewShotRef.current.capture();
      console.log('uri', uri);
      const shareOptions = {
        title: 'Capytion',
        message: text,
        urls: [uri],
      };
      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing caption:', error);
      setSnackbarMessage('Error sharing caption');
      setSnackbarVisible(true);
    }
  };

  const getRandomGradient = () => {
    const gradients = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Vibrant Sunset
      ['#8A2387', '#E94057', '#F27121'], // Love and Liberty
      ['#00C9FF', '#92FE9D'], // Lunada
      ['#FC466B', '#3F5EFB'], // Sublime Light
      ['#3494E6', '#EC6EAD'], // Disco Club
      ['#FDBB2D', '#22C1C3'], // Lemon Twist
      ['#FF0099', '#493240'], // Neon Glow
      ['#1FA2FF', '#12D8FA', '#A6FFCB'], // Ocean Breeze
      ['#FF512F', '#F09819'], // Burning Orange
      ['#4776E6', '#8E54E9'], // Electric Violet
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  const renderCaptionItem = ({ item, index }) => {
    const gradientColors = getRandomGradient();
    return (
      <Card style={styles.card}>
        <LinearGradient colors={gradientColors} style={{ flex: 1 }}>
          <Image source={{ uri: image }} style={styles.captionImage} />
          <ViewShot ref={viewShotRef}>
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>"{item?.longcaption}"</Text>
            </View>
          </ViewShot>
          <Divider />
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(item.longcaption)}
            >
              <Icon
                name="content-copy"
                size={20}
                color={theme.colors.surface}
              />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareCaption(item.longcaption, image)}
            >
              <Icon
                name="share-variant"
                size={20}
                color={theme.colors.surface}
              />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReport(item.id)} // Add report button
            >
              <Icon
                name="alert-circle-outline"
                size={20}
                color={theme.colors.surface}
              />
              <Text style={styles.actionText}>Report</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#4ECDC4', '#45B649']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Header isBack={true} title="Generated Captions" />
      <FlatList
        data={captions}
        renderItem={renderCaptionItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
      />
      <ReportContentModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </LinearGradient>
  );
};

export default CaptionDetailsList;
