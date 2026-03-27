import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  useTheme
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CreditPackageCard = ({ package: pkg, isSelected, onSelect }) => {
  const theme = useTheme();

  const getTierColor = (tier) => {
    switch (tier) {
      case 'starter': return '#28a745';
      case 'popular': return '#007bff';
      case 'premium': return '#6f42c1';
      case 'enterprise': return '#dc3545';
      default: return theme.colors.primary;
    }
  };

  const renderBadge = () => {
    if (!pkg.displaySettings?.badge) return null;

    return (
      <View style={styles.badgeContainer}>
        <Chip
          mode="flat"
          compact
          textStyle={[styles.badgeText, { color: 'white' }]}
          style={[
            styles.badge,
            { backgroundColor: pkg.displaySettings.badge.color }
          ]}
        >
          {pkg.displaySettings.badge.text}
        </Chip>
      </View>
    );
  };

  const renderDiscount = () => {
    if (!pkg.discountPercentage || pkg.discountPercentage <= 0) return null;

    return (
      <View style={styles.discountContainer}>
        <Text style={styles.discountText}>
          {pkg.discountPercentage}% OFF
        </Text>
      </View>
    );
  };

  const renderPricing = () => (
    <View style={styles.pricingContainer}>
      <View style={styles.priceRow}>
        <Text style={styles.currentPrice}>₹{pkg.price}</Text>
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
    <View style={styles.creditsContainer}>
      <View style={styles.creditsRow}>
        <MaterialCommunityIcons
          name="wallet"
          size={20}
          color={getTierColor(pkg.tier)}
        />
        <Text style={styles.creditsText}>
          {pkg.credits} Credits
        </Text>
      </View>
      {pkg.bonusCredits > 0 && (
        <View style={styles.bonusRow}>
          <MaterialCommunityIcons
            name="gift"
            size={16}
            color="#ff9800"
          />
          <Text style={styles.bonusText}>
            +{pkg.bonusCredits} Bonus Credits
          </Text>
        </View>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>
          Total: {pkg.totalCredits} Credits
        </Text>
      </View>
    </View>
  );

  const renderFeatures = () => {
    if (!pkg.features || pkg.features.length === 0) return null;

    return (
      <View style={styles.featuresContainer}>
        {pkg.features.slice(0, 3).map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color="#28a745"
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
        {pkg.features.length > 3 && (
          <Text style={styles.moreFeatures}>
            +{pkg.features.length - 3} more features
          </Text>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.7}>
      <Card
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          pkg.displaySettings?.isRecommended && styles.recommendedCard,
          { borderColor: getTierColor(pkg.tier) }
        ]}
        elevation={isSelected ? 6 : 2}
      >
        {renderBadge()}
        {renderDiscount()}

        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.packageName, { color: getTierColor(pkg.tier) }]}>
              {pkg.name}
            </Text>
            {pkg.displaySettings?.isRecommended && (
              <MaterialCommunityIcons
                name="star"
                size={20}
                color="#ffc107"
              />
            )}
          </View>

          <Text style={styles.description}>{pkg.description}</Text>

          {renderCredits()}
          {renderPricing()}
          {renderFeatures()}

          {isSelected && (
            <View style={styles.selectedIndicator}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.selectedText}>Selected</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  recommendedCard: {
    borderWidth: 3,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: 16,
    zIndex: 10,
  },
  badge: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 5,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  creditsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bonusText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '500',
    marginLeft: 6,
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pricingContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  pricePerCredit: {
    fontSize: 12,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#007bff',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  selectedText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
});

export default CreditPackageCard;