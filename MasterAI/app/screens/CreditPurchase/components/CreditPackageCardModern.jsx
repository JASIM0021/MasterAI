import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  useTheme
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CreditPackageCardModern = ({ package: pkg, isSelected, onSelect }) => {
  const theme = useTheme();

  const getTierGradients = (tier) => {
    switch (tier) {
      case 'starter':
        return {
          colors: ['#2ECC71', '#27AE60'],
          badgeGradient: ['#27AE60', '#1E8449']
        };
      case 'popular':
        return {
          colors: ['#3498DB', '#2980B9'],
          badgeGradient: ['#2980B9', '#1F4E79']
        };
      case 'premium':
        return {
          colors: ['#9B59B6', '#8E44AD'],
          badgeGradient: ['#8E44AD', '#6C3483']
        };
      case 'enterprise':
        return {
          colors: ['#E74C3C', '#C0392B'],
          badgeGradient: ['#C0392B', '#922B21']
        };
      default:
        return {
          colors: ['#3498DB', '#2980B9'],
          badgeGradient: ['#2980B9', '#1F4E79']
        };
    }
  };

  const tierGradients = getTierGradients(pkg.tier);

  const renderBadge = () => {
    if (!pkg.displaySettings?.badge) return null;

    return (
      <View style={styles.badgeContainer}>
        <LinearGradient
          colors={tierGradients.badgeGradient}
          style={styles.badgeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.badgeText}>
            {pkg.displaySettings.badge.text}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderPopularBadge = () => {
    if (!pkg.displaySettings?.isRecommended) return null;

    return (
      <View style={styles.popularBadgeContainer}>
        <LinearGradient
          colors={['#FF6B6B', '#FF5252']}
          style={styles.popularBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialCommunityIcons name="crown" size={14} color="white" />
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderDiscount = () => {
    if (!pkg.discountPercentage || pkg.discountPercentage <= 0) return null;

    return (
      <View style={styles.discountContainer}>
        <LinearGradient
          colors={['#FF9500', '#FF6B00']}
          style={styles.discountGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.discountText}>
            {pkg.discountPercentage}% OFF
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderPricing = () => (
    <View style={styles.pricingContainer}>
      <View style={styles.priceRow}>
        <Text style={[styles.currentPrice, { color: tierGradients.colors[0] }]}>
          ₹{pkg.price}
        </Text>
        {pkg.originalPrice && pkg.originalPrice > pkg.price && (
          <Text style={styles.originalPrice}>₹{pkg.originalPrice}</Text>
        )}
      </View>
      <Text style={styles.pricePerCredit}>
        ₹{pkg.pricePerCredit} per credit
      </Text>
    </View>
  );

  const renderCredits = () => (
    <LinearGradient
      colors={[tierGradients.colors[0] + '15', tierGradients.colors[1] + '10']}
      style={styles.creditsContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.creditsHeader}>
        <MaterialCommunityIcons
          name="wallet"
          size={24}
          color={tierGradients.colors[0]}
        />
        <View style={styles.creditsInfo}>
          <Text style={[styles.creditsText, { color: tierGradients.colors[0] }]}>
            {pkg.credits} Credits
          </Text>
          {pkg.bonusCredits > 0 && (
            <View style={styles.bonusRow}>
              <MaterialCommunityIcons
                name="gift"
                size={16}
                color="#FF9500"
              />
              <Text style={styles.bonusText}>
                +{pkg.bonusCredits} Bonus
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.totalRow}>
        <LinearGradient
          colors={tierGradients.colors}
          style={styles.totalBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.totalText}>
            {pkg.totalCredits} Total Credits
          </Text>
        </LinearGradient>
      </View>
    </LinearGradient>
  );

  const renderFeatures = () => {
    if (!pkg.features || pkg.features.length === 0) return null;

    return (
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Included Features:</Text>
        {pkg.features.slice(0, 3).map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <LinearGradient
              colors={['#2ECC71', '#27AE60']}
              style={styles.featureIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name="check"
                size={12}
                color="white"
              />
            </LinearGradient>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
        {pkg.features.length > 3 && (
          <Text style={[styles.moreFeatures, { color: tierGradients.colors[0] }]}>
            +{pkg.features.length - 3} more premium features
          </Text>
        )}
      </View>
    );
  };

  const renderSelectedIndicator = () => {
    if (!isSelected) return null;

    return (
      <LinearGradient
        colors={tierGradients.colors}
        style={styles.selectedIndicator}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color="white"
        />
        <Text style={styles.selectedText}>Selected Package</Text>
      </LinearGradient>
    );
  };

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
      <Card
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          pkg.displaySettings?.isRecommended && styles.recommendedCard,
        ]}
        elevation={isSelected ? 8 : 4}
      >
        {/* Gradient Border Effect */}
        <LinearGradient
          colors={isSelected ? tierGradients.colors : ['transparent', 'transparent']}
          style={styles.gradientBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.innerCard}>
            {renderPopularBadge()}
            {renderBadge()}
            {renderDiscount()}

            <Card.Content style={styles.content}>
              <View style={styles.header}>
                <Text style={[styles.packageName, { color: tierGradients.colors[0] }]}>
                  {pkg.name}
                </Text>
                {pkg.displaySettings?.isRecommended && (
                  <MaterialCommunityIcons
                    name="star"
                    size={24}
                    color="#FFD700"
                  />
                )}
              </View>

              <Text style={styles.description}>{pkg.description}</Text>

              {renderCredits()}
              {renderPricing()}
              {renderFeatures()}
              {renderSelectedIndicator()}

            </Card.Content>
          </View>
        </LinearGradient>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
  },
  recommendedCard: {
    marginVertical: 16,
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  innerCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    position: 'relative',
  },
  popularBadgeContainer: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 5,
  },
  discountGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 3,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  creditsContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditsInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creditsText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bonusText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 4,
  },
  totalRow: {
    alignItems: 'center',
  },
  totalBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  pricingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  pricePerCredit: {
    fontSize: 12,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginTop: 8,
    elevation: 3,
  },
  selectedText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default CreditPackageCardModern;