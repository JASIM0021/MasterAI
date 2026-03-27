import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  Snackbar,
  Avatar,
  Button,
  Divider,
} from 'react-native-paper';
import Header from '../../Components/header/Header';
import * as Clipboard from 'expo-clipboard';
import { responsiveWidth, responsiveHeight } from '../../themes';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import Share from 'react-native-share';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ReportContentModal from '../../Components/Model/ReportContentModal';
import { useReportMutation } from '../../features/api/upload/uploadPhoto';

const { width } = Dimensions.get('window');

const PostDetailsList = ({ route }) => {
  const theme = useTheme();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const posts = route.params?.data?.data || [];
  const image = route.params?.data?.image;
  const platform = route.params?.data?.platform;
  console.log('posts', route.params?.data);
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    listContainer: {
      padding: 16,
    },
    card: {
      marginBottom: 16,
      elevation: 4,
      borderRadius: 12,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    userInfo: {
      marginLeft: 16,
      flex: 1,
    },
    username: {
      fontWeight: 'bold',
      fontSize: 18,
    },
    postTime: {
      color: theme.colors.placeholder,
      fontSize: 14,
    },
    postImage: {
      width: '100%',
      height: width * 0.75,
      resizeMode: 'cover',
    },
    postContent: {
      fontSize: 16,
      marginBottom: 16,
      padding: 16,
      lineHeight: 24,
    },
    hashtagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    hashtag: {
      color: theme.colors.primary,
      marginRight: responsiveWidth * 0.4,
      marginBottom: responsiveHeight * 0.3,
      fontSize: 14,
    },
    actionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: theme.colors.backdrop,
      paddingVertical: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionText: {
      marginLeft: 4,
      color: theme.colors.primary,
    },
    gradientOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '50%',
    },
  });

  const handleCopy = async text => {
    await Clipboard.setStringAsync(text);
    setSnackbarMessage('Post copied to clipboard');
    setSnackbarVisible(true);
  };

  console.log('platform', platform);
  const handleShare = async text => {
    try {
      console.log('text', text);
      const shareOptions = {
        title: 'Share POST',
        message: text,
        social:
          platform == 'Facebook'
            ? platform == 'LinkedIn'
              ? Share.Social.LINKEDIN
              : Share.Social.FACEBOOK
            : Share.Social.FACEBOOK,
        urls: [image],
      };
      Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing post:', error);
    }
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

  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [report] = useReportMutation();

  const handleReport = async postId => {
    setCurrentPostId(postId);
    setReportModalVisible(true); // Show the report modal
  };

  const handleSubmitReport = async reportData => {
    // Logic to submit the report (e.g., send a request to the server)
    console.log(`Report for post ${currentPostId}:`, reportData);
    setSnackbarVisible(true);
    setSnackbarMessage(
      `Report for post ${
        currentPostId || Math.random().toString(36).substr(2, 9)
      }:`,
    );
    report(reportData);
    // You can add your API call here
  };
  const renderPostItem = ({ item, index }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar.Image
          size={50}
          source={{ uri: 'https://via.placeholder.com/50' }}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>User Name</Text>
          <Text style={styles.postTime}>2 hours ago</Text>
        </View>
        <IconButton
          icon="dots-vertical"
          onPress={() => {}}
          color={theme.colors.primary}
        />
      </View>
      <View>
        <Image source={{ uri: image }} style={styles.postImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
        />
      </View>
      <Text style={styles.postContent}>{item.post}</Text>
      <View style={styles.hashtagContainer}>
        {item?.hasttag?.split(' ').map((tag, tagIndex) => (
          <TouchableOpacity key={tagIndex}>
            <Text style={styles.hashtag}>#{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Divider />
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <MaterialCommunityIcons
            name="heart-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <MaterialCommunityIcons
            name="comment-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCopy(item.post)}
        >
          <MaterialCommunityIcons
            name="content-copy"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShare(item.post)}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReport(item.id)} // Assuming item has an id
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={24}
            color={theme.colors.primary}
          />
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ReportContentModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.gradientBackground}
      />
      <Header isBack={true} title="Generated Posts" />
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

export default PostDetailsList;
