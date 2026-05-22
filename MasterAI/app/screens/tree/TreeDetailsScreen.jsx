import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Button,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
} from 'react-native-paper';
import Header from '../../Components/header/Header';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import AdBanner from '../../Components/ads/AdBanner';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiconstant from '../../Constant/apiconstant';
import {
  useFonts,
  Poppins_700Bold,
  Poppins_400Regular,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

const TreeDetailsScreen = ({ route }) => {
  const { data } = route.params;
  const theme = useTheme();
  const viewShotRef = React.useRef();
  const [showScientificInfo, setShowScientificInfo] = useState(false);

  let [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  const treeData = data?.data[0]; // Assuming the first item in the array is the tree data

  console.log('treeData', treeData);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    card: {
      marginBottom: 16,
      borderRadius: 24,
      overflow: 'hidden',
      elevation: 8,
    },
    imageContainer: {
      width: '100%',
      height: 300,
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 24,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    shareButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 32,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    languageContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    languageLabel: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.secondary,
    },
    languageText: {
      fontSize: 20,
      color: theme.colors.onSurface,
    },
    scientificNameContainer: {
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
      position: 'relative',
    },
    scientificNameLabel: {
      fontSize: 20,
      color: theme.colors.surface,
      fontFamily: 'Poppins_600SemiBold',
      marginBottom: 12,
      textAlign: 'center',
    },
    scientificName: {
      fontSize: 28,
      fontStyle: 'italic',
      color: theme.colors.surface,
      textAlign: 'center',
      fontFamily: 'Poppins_700Bold',
      letterSpacing: 1,
    },
    infoIcon: {
      position: 'absolute',
      top: 12,
      right: 12,
    },
    gradientButton: {
      marginTop: 32,
      borderRadius: 16,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    buttonText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 12,
    },
    divider: {
      height: 2,
      marginVertical: 16,
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
  });

  const handleShare = async () => {
    console.log('Share button clicked');
    try {
      const uri = await viewShotRef.current.capture();

      const shareOptions = {
        title: 'Capytion',
        message: `Check out this AI tree analysis: ${treeData.English}\n\nIdentified using Master Ai  - Download the app: ${apiconstant.appUrl}`,
        url: uri,
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient
      colors={['#00b09b', '#96c93d', '#ffd194']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Header isBack={true} title="Analyze Details" />
      <ScrollView>
        <View style={styles.content}>
          <ViewShot ref={viewShotRef}>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: data?.image }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <IconButton
                    icon="share-variant"
                    color={theme.colors.primary}
                    size={24}
                    onPress={handleShare}
                    style={styles.shareButton}
                  />
                </View>
                <View style={styles.avatarContainer}>
                  <Avatar.Icon size={80} icon="tree" />
                </View>

                <Text style={styles.title}>Identification Results</Text>

                <View style={styles.scientificNameContainer}>
                  <Text style={styles.scientificNameLabel}>
                    Scientific Name
                  </Text>
                  <Text style={styles.scientificName}>
                    {treeData.sciencetificName}
                  </Text>
                  <Tooltip title="Click for more information">
                    <IconButton
                      icon="information"
                      color={theme.colors.surface}
                      size={24}
                      onPress={() => setShowScientificInfo(!showScientificInfo)}
                      style={styles.infoIcon}
                    />
                  </Tooltip>
                </View>
                {showScientificInfo && (
                  <Text
                    style={{
                      textAlign: 'center',
                      marginBottom: 16,
                      fontFamily: 'Poppins_400Regular',
                      fontSize: 16,
                      color: theme.colors.onSurface,
                      paddingHorizontal: 16,
                    }}
                  >
                    The scientific name is the formal name given to a species in
                    biology. It consists of two parts: the genus name and the
                    specific epithet.
                  </Text>
                )}

                <View style={styles.languageContainer}>
                  <Text style={styles.languageLabel}>English:</Text>
                  <Text style={styles.languageText}>{treeData.English}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.languageContainer}>
                  <Text style={styles.languageLabel}>Bengali:</Text>
                  <Text style={styles.languageText}>{treeData.benguli}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.languageContainer}>
                  <Text style={styles.languageLabel}>Hindi:</Text>
                  <Text style={styles.languageText}>{treeData.hindi}</Text>
                </View>
              </Card.Content>
            </Card>
          </ViewShot>
        </View>
      </ScrollView>
      <AdBanner />
    </LinearGradient>
  );
};

export default TreeDetailsScreen;
