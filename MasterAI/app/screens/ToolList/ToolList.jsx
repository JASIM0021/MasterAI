import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Appbar, List, Searchbar, Text, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { SCREEN_NAME } from '../../Constant';
import { LinearGradient } from 'expo-linear-gradient';
import { responsiveHeight } from '../../themes';
import { ALL_TOOLS, CATEGORIES } from './ToolConstant';
import TabsBottom from '../TabsSwitch/TabsBottom';
import UpdateBanner from '../update/AppUpdate';
import FeatureModal from '../../Components/Model/FeatureModal';
import LowCreditBanner from '../../Components/ads/LowCreditBanner';
import { SafeScreen } from '../../Components/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ToolList = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));
  const [featureModel, setFeatureModel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Staggered animation values for cards
  const cardAnimations = useRef(
    Array.from({ length: 20 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
      scale: new Animated.Value(0.9),
    }))
  ).current;

  useEffect(() => {
    // Initial entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation for featured items
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous rotation for loading states
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    // Animate cards when they appear
    const animations = cardAnimations.slice(0, filteredTools.length).map((anim, index) =>
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    const translateAnimations = cardAnimations.slice(0, filteredTools.length).map((anim, index) =>
      Animated.timing(anim.translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    const scaleAnimations = cardAnimations.slice(0, filteredTools.length).map((anim, index) =>
      Animated.timing(anim.scale, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    Animated.parallel([...animations, ...translateAnimations, ...scaleAnimations]).start();
  }, [filteredTools]);

  const filteredTools = ALL_TOOLS(navigation).filter(
    tool =>
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === 'All' || tool.category === selectedCategory),
  );

  const upcommingTools = () => {
    Alert.alert('Coming Soon', 'This feature is not yet available.');
  };

  const animatePress = (index) => {
    const cardAnim = cardAnimations[index];
    if (cardAnim) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(cardAnim.scale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(cardAnim.scale, {
            toValue: 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(cardAnim.opacity, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(cardAnim.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  };

  const getGradientColors = (category, index) => {
    const gradients = {
      'New': ['#FF6B6B', '#4ECDC4', '#45B7D1'],
      'Image': ['#667eea', '#764ba2', '#667eea'],
      'Social Media': ['#f093fb', '#f5576c', '#4facfe'],
      'Education': ['#43e97b', '#38f9d7', '#43e97b'],
      'Analysis': ['#4facfe', '#00f2fe', '#4facfe'],
      'Writing': ['#a8edea', '#fed6e3', '#a8edea'],
      'Coding': ['#ffecd2', '#fcb69f', '#ffecd2'],
      'Design': ['#ff9a9e', '#fecfef', '#fad0c4'],
      'All': ['#667eea', '#764ba2', '#667eea']
    };

    const colors = gradients[category] || gradients['All'];
    return [colors[index % 2], colors[(index + 1) % colors.length]];
  };

  const renderToolItem = (tool, index) => {
    const cardAnim = cardAnimations[index] || { opacity: new Animated.Value(1), translateY: new Animated.Value(0), scale: new Animated.Value(1) };
    const isNewTool = tool.category === 'New';

    return (
      <Animated.View
        key={index}
        style={[
          styles.gridItem,
          {
            opacity: cardAnim.opacity,
            transform: [
              { translateY: cardAnim.translateY },
              { scale: cardAnim.scale },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            animatePress(index);
            setTimeout(() => tool.onNavigate(tool.title), 150);
          }}
          style={styles.touchable}
          activeOpacity={0.9}
        >
          {/* Glassmorphism background */}
          <View style={styles.glassmorphContainer}>
            <LinearGradient
              colors={getGradientColors(tool.category, index)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            >
              {/* Shimmer effect overlay for new tools */}
              {isNewTool && (
                <Animated.View
                  style={[
                    styles.shimmerOverlay,
                    {
                      transform: [
                        {
                          scale: pulseAnim,
                        },
                      ],
                    },
                  ]}
                />
              )}

              <View style={styles.toolContent}>
                {/* Enhanced icon container */}
                <Animated.View
                  style={[
                    styles.iconContainer,
                    isNewTool && {
                      transform: [
                        {
                          rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {tool.icon === 'instagram' ||
                  tool.icon === 'chat-question' ||
                  tool.icon === 'thought-bubble' ||
                  tool.icon === 'pine-tree' ||
                  tool.icon === 'tshirt-crew' ||
                  tool.icon === 'video' ||
                  tool.icon === 'image-edit' ||
                  tool.icon === 'twitter' ? (
                    <MaterialCommunityIcons
                      name={tool.icon}
                      size={36}
                      color="#ffffff"
                      style={styles.iconShadow}
                    />
                  ) : (
                    <Icon
                      name={tool.icon}
                      size={36}
                      color="#ffffff"
                      style={styles.iconShadow}
                    />
                  )}
                </Animated.View>

                <Text style={styles.toolTitle}>{tool.title}</Text>

                {/* Category badge */}
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{tool.category}</Text>
                </View>

                {/* New badge for new tools */}
                {isNewTool && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>

              {/* Floating particles effect */}
              <View style={styles.particlesContainer}>
                {[...Array(3)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [10, -10],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeScreen
      edges={['left', 'right']}
      scroll={false}
    >
      <UpdateBanner />
      {/* <LowCreditBanner
        source="main_screen"
        onPurchasePress={() => navigation.navigate(SCREEN_NAME.CreditPurchase)}
      /> */}

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <LinearGradient colors={['#f8fafc', '#e2e8f0', '#cbd5e1']} style={styles.containerGradient}>

          {/* Enhanced Header with floating elements */}
          <Animated.View
            style={[
              styles.headerGradient,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#667eea']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerGradientBackground, { paddingTop: insets.top }]}
            >
              {/* Floating geometric shapes */}
              <View style={styles.floatingShapes}>
                <Animated.View
                  style={[
                    styles.floatingCircle,
                    {
                      transform: [
                        {
                          rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.floatingSquare,
                    {
                      transform: [
                        {
                          rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['360deg', '0deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>

              <Appbar.Header style={styles.appBar} statusBarHeight={0}>
                <Appbar.Content
                  title="🚀 MasterAI Tools"
                  titleStyle={styles.appBarTitle}
                />
                {/* Status indicator */}
                <Animated.View
                  style={[
                    styles.statusIndicator,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
              </Appbar.Header>
            </LinearGradient>
          </Animated.View>

          {/* Enhanced Search Bar */}
          <Animated.View
            style={[
              styles.searchBarGradient,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchGradientBackground}
            >
              <Searchbar
                placeholder="Discover amazing AI tools..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchBarInput}
                iconColor="#ffffff"
                placeholderTextColor="rgba(255,255,255,0.8)"
              />
            </LinearGradient>
          </Animated.View>
          {/* Enhanced Category Section */}
          <Animated.View
            style={[
              styles.categorySection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryContainer}
              contentContainerStyle={styles.categoryContentContainer}
            >
              {CATEGORIES.map((category, index) => (
                <Animated.View
                  key={category}
                  style={[
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category && styles.selectedCategoryChip,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        selectedCategory === category
                          ? ['#4facfe', '#00f2fe']
                          : ['#ffffff', '#f0f0f0']
                      }
                      style={styles.categoryChipGradient}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategory === category &&
                            styles.selectedCategoryChipText,
                        ]}
                      >
                        {category}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Tools Grid with enhanced layout */}
          <Animated.View
            style={[
              styles.toolsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.toolsHeader}>
              <Text style={styles.toolsTitle}>
                {selectedCategory === 'All' ? 'All Tools' : `${selectedCategory} Tools`}
              </Text>
              <Text style={styles.toolsCount}>
                {filteredTools.length} tools available
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
            >
              {filteredTools.map(renderToolItem)}
            </ScrollView>
          </Animated.View>

          {/* <TabsBottom selectedTabs={"All Tools"} /> */}
          <FeatureModal
            visible={featureModel}
            onClose={() => setFeatureModel(false)}
            onTryNow={() => {
              console.log('"first"', 'first');
              navigation.navigate(SCREEN_NAME.AIImageEdits);
            }}
          />
        </LinearGradient>
      </Animated.View>
    </SafeScreen>
  );
};

export default ToolList;

const { width, height } = Dimensions.get('window');
const itemWidth = (width - 48) / 2; // 2 columns with 16px padding on each side

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },
  containerGradient: {
    flex: 1,
  },

  // Header Section
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradientBackground: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  appBar: {
    backgroundColor: 'transparent',
    elevation: 0,
    height: 56,
  },
  appBarTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Floating elements in header
  floatingShapes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  floatingCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: 20,
    right: 30,
  },
  floatingSquare: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 60,
    left: 40,
    borderRadius: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    marginRight: 16,
  },

  // Search Section
  searchBarGradient: {
    margin: 16,
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  searchGradientBackground: {
    borderRadius: 25,
    padding: 2,
  },
  searchBar: {
    backgroundColor: 'transparent',
    elevation: 0,
    borderRadius: 23,
  },
  searchBarInput: {
    color: '#ffffff',
    fontSize: 16,
  },

  // Category Section
  categorySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 16,
    marginBottom: 12,
  },
  categoryContainer: {
    paddingHorizontal: 16,
  },
  categoryContentContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  categoryChip: {
    borderRadius: 25,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  categoryChipGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  selectedCategoryChip: {
    elevation: 6,
    shadowOpacity: 0.3,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectedCategoryChipText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Tools Section
  toolsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  toolsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toolsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  toolsCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Grid and Card Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  gridItem: {
    width: itemWidth,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  glassmorphContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  gradientBackground: {
    borderRadius: 20,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },

  // Tool Content
  toolContent: {
    alignItems: 'center',
    padding: 20,
    aspectRatio: 1,
    justifyContent: 'space-between',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  toolTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Badges
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    position: 'absolute',
    top: 8,
    right: 8,
    elevation: 4,
  },
  newBadgeText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Particle Effects
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
