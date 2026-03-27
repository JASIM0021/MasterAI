import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  Divider,
  useTheme,
  IconButton
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useFetchCreditPackagesQuery,
  useInitiatePaymentMutation,
  useGetUnifiedCreditBalanceQuery,
  useMigrateToGlobalCreditsMutation
} from '../../features/api/creditsApiSlice';
import { selectCurrentUser, selectIsAuthenticated } from '../../features/auth/authSlice';
import CreditPackageCardModern from './components/CreditPackageCardModern';
import PaymentWebView from './components/PaymentWebView';
import RewardedAdButton from '../../Components/ads/RewardedAdButton';

const { width, height } = Dimensions.get('window');

const CreditPurchaseScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  // API hooks
  const {
    data: packagesData,
    isLoading: packagesLoading,
    error: packagesError,
    refetch: refetchPackages
  } = useFetchCreditPackagesQuery(undefined, {
    skip: !isAuthenticated
  });

  const {
    data: creditBalanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance
  } = useGetUnifiedCreditBalanceQuery(undefined, {
    skip: !isAuthenticated
  });

  const [initiatePayment, {
    isLoading: initiatingPayment
  }] = useInitiatePaymentMutation();

  const [migrateToGlobal, {
    isLoading: migrating
  }] = useMigrateToGlobalCreditsMutation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.navigate('AuthScreen');
    }
  }, [isAuthenticated, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPackages(),
        refetchBalance()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePackageSelect = (packageData) => {
    setSelectedPackage(packageData);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a credit package first');
      return;
    }

    if (!currentUser?.email || !currentUser?.name) {
      Alert.alert('Error', 'User profile information is incomplete');
      return;
    }

    try {
      const customerDetails = {
        firstName: currentUser.name.split(' ')[0] || currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || ''
      };

      const response = await initiatePayment({
        packageId: selectedPackage.id,
        customerDetails
      }).unwrap();

      if (response.success) {
        setPaymentData(response.paymentData);
        setShowPaymentWebView(true);
      } else {
        Alert.alert('Payment Error', 'Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      Alert.alert(
        'Payment Error',
        error.data?.message || 'Failed to initiate payment. Please try again.'
      );
    }
  };

  const handleMigrateToGlobal = async () => {
    try {
      const response = await migrateToGlobal().unwrap();
      if (response.success) {
        Alert.alert(
          'Migration Successful',
          'Your account has been upgraded to the global credit system!',
          [{ text: 'OK', onPress: () => refetchBalance() }]
        );
      }
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert('Migration Error', 'Failed to migrate to global credits');
    }
  };

  const handlePaymentComplete = (success, data) => {
    setShowPaymentWebView(false);
    setPaymentData(null);
    setSelectedPackage(null);

    if (success) {
      Alert.alert(
        'Payment Successful!',
        `Your credits have been added to your account.`,
        [
          {
            text: 'OK',
            onPress: () => {
              refetchBalance();
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Payment Failed',
        data?.message || 'Payment was not completed successfully.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAdCompleted = (result) => {
    // Refresh credit balance after successful ad completion
    refetchBalance();
  };

  const renderCreditBalance = () => {
    if (balanceLoading) {
      return (
        <LinearGradient
          colors={['#E3F2FD', '#BBDEFB']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceContent}>
            <ActivityIndicator size="small" color="#1976D2" />
            <Text style={styles.loadingBalanceText}>Loading your balance...</Text>
          </View>
        </LinearGradient>
      );
    }

    if (!creditBalanceData?.credits) {
      return null;
    }

    const { credits } = creditBalanceData;
    const isGlobal = credits.type === 'global';

    const gradientColors = isGlobal ?
      ['#667eea', '#764ba2'] :
      ['#ffecd2', '#fcb69f'];

    return (
      <LinearGradient
        colors={gradientColors}
        style={styles.modernBalanceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.modernBalanceContent}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconContainer}>
              <LinearGradient
                colors={isGlobal ? ['#4FC3F7', '#29B6F6'] : ['#FF9800', '#FF6F00']}
                style={styles.balanceIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name={isGlobal ? "wallet" : "credit-card-multiple"}
                  size={28}
                  color="white"
                />
              </LinearGradient>
            </View>
            <View style={styles.balanceTitleContainer}>
              <Text style={styles.modernBalanceTitle}>
                {isGlobal ? 'Global Credits' : 'Legacy Credits'}
              </Text>
              <Text style={styles.balanceSubtitle}>
                {isGlobal ? 'Universal credits for all AI tools' : 'Service-specific credits'}
              </Text>
            </View>
            {!isGlobal && (
              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={styles.upgradeButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Button
                  mode="text"
                  onPress={handleMigrateToGlobal}
                  loading={migrating}
                  disabled={migrating}
                  compact
                  labelStyle={styles.upgradeButtonText}
                >
                  Upgrade
                </Button>
              </LinearGradient>
            )}
          </View>

          {isGlobal ? (
            <View style={styles.modernGlobalBalance}>
              <View style={styles.balanceAmountContainer}>
                <Text style={styles.modernBalanceAmount}>{credits.balance || 0}</Text>
                <Text style={styles.creditsLabel}>Credits</Text>
              </View>

              <View style={styles.balanceStatsContainer}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="shopping" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statLabel}>Purchased</Text>
                  <Text style={styles.statValue}>{credits.totalPurchased || 0}</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="rocket-launch" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.statLabel}>Used</Text>
                  <Text style={styles.statValue}>{credits.totalUsed || 0}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.legacyBalance}>
              <Text style={styles.legacyBalanceLabel}>Service Credits Remaining:</Text>
              <View style={styles.servicesContainer}>
                {credits.services && Object.entries(credits.services).map(([service, data]) => (
                  <View key={service} style={styles.serviceItem}>
                    <Text style={styles.serviceName}>{service}</Text>
                    <View style={styles.serviceProgressContainer}>
                      <View style={styles.serviceProgress}>
                        <LinearGradient
                          colors={['#4CAF50', '#45A049']}
                          style={[
                            styles.serviceProgressFill,
                            { width: `${(data.remaining / data.total) * 100}%` }
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                      <Text style={styles.serviceCredit}>
                        {data.remaining}/{data.total}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={styles.migrateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Button
                  mode="text"
                  onPress={handleMigrateToGlobal}
                  loading={migrating}
                  disabled={migrating}
                  labelStyle={styles.migrateButtonText}
                >
                  Upgrade to Global Credits
                </Button>
              </LinearGradient>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const renderPackages = () => {
    if (packagesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading credit packages...</Text>
        </View>
      );
    }

    if (packagesError) {
      return (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>Failed to load credit packages</Text>
            <Button mode="outlined" onPress={refetchPackages}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      );
    }

    if (!packagesData?.packages?.length) {
      return (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>No credit packages available</Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <View style={styles.packagesContainer}>
        <Text style={styles.sectionTitle}>Choose a Credit Package</Text>
        <Text style={styles.sectionSubtitle}>
          Select a package that best fits your needs
        </Text>

        {packagesData.packages.map((pkg) => (
          <CreditPackageCardModern
            key={pkg.id}
            package={pkg}
            isSelected={selectedPackage?.id === pkg.id}
            onSelect={() => handlePackageSelect(pkg)}
          />
        ))}
      </View>
    );
  };

  if (showPaymentWebView && paymentData) {
    return (
      <PaymentWebView
        paymentData={paymentData}
        onComplete={handlePaymentComplete}
        onCancel={() => {
          setShowPaymentWebView(false);
          setPaymentData(null);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <IconButton
              icon="arrow-left"
              iconColor="white"
              size={24}
              onPress={() => navigation.goBack()}
            />
            <Text style={styles.headerTitle}>Purchase Credits</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.headerInfo}>
            <MaterialCommunityIcons name="wallet" size={32} color="white" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerMainText}>Boost Your AI Power</Text>
              <Text style={styles.headerSubText}>
                Buy credits to unlock unlimited AI features
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {renderCreditBalance()}

          {/* Free Credits Section */}
          <View style={styles.freeCreditsSection}>
            <LinearGradient
              colors={['#f3f4f6', '#ffffff']}
              style={styles.freeCreditsCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.freeCreditsHeader}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.freeCreditsIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons
                    name="gift-outline"
                    size={32}
                    color="white"
                  />
                </LinearGradient>
                <View style={styles.freeCreditsTextContainer}>
                  <Text style={styles.freeCreditsTitle}>Get Free Credits</Text>
                  <Text style={styles.freeCreditsSubtitle}>
                    Watch ads to earn credits instantly
                  </Text>
                </View>
              </View>

              <Text style={styles.freeCreditsDescription}>
                No payment required! Watch short video ads and earn 5 credits each time.
                Perfect for trying out AI features without spending money.
              </Text>

              <View style={styles.freeCreditsActions}>
                <View style={styles.rewardButtonContainer}>
                  <RewardedAdButton
                    source="credit_purchase"
                    size="large"
                    variant="success"
                    onAdCompleted={handleAdCompleted}
                    style={styles.freeCreditsButton}
                  />
                  <View style={styles.freeCreditsStats}>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons
                        name="clock-fast"
                        size={20}
                        color="#6B7280"
                      />
                      <Text style={styles.statText}>~30 seconds</Text>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons
                        name="infinity"
                        size={20}
                        color="#6B7280"
                      />
                      <Text style={styles.statText}>Unlimited</Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Divider */}
          <View style={styles.dividerSection}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Text style={styles.dividerText}>OR</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Purchase Section Header */}
          <View style={styles.purchaseSectionHeader}>
            <Text style={styles.purchaseSectionTitle}>Purchase Credit Packages</Text>
            <Text style={styles.purchaseSectionSubtitle}>
              Get more credits with bonus offers
            </Text>
          </View>

          <View style={styles.packagesSection}>
            {renderPackages()}
          </View>

          {selectedPackage && (
            <View style={styles.purchaseSection}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.selectedPackageCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.selectedPackageContent}>
                  <View style={styles.selectedHeader}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color="white"
                    />
                    <Text style={styles.selectedTitle}>Selected Package</Text>
                  </View>

                  <Text style={styles.selectedName}>{selectedPackage.name}</Text>
                  <Text style={styles.selectedDetails}>
                    {selectedPackage.totalCredits} Credits for ₹{selectedPackage.price}
                  </Text>

                  <View style={styles.savingsContainer}>
                    <MaterialCommunityIcons
                      name="gift"
                      size={20}
                      color="#FFD700"
                    />
                    <Text style={styles.savingsText}>
                      Save ₹{((selectedPackage.totalCredits * 1) - selectedPackage.price).toFixed(0)} with this package!
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={styles.purchaseButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Button
                  mode="text"
                  onPress={handlePurchase}
                  loading={initiatingPayment}
                  disabled={initiatingPayment}
                  labelStyle={styles.purchaseButtonText}
                  icon={initiatingPayment ? undefined : "credit-card"}
                  contentStyle={styles.purchaseButtonContent}
                >
                  {initiatingPayment ? 'Processing Payment...' : `Pay ₹${selectedPackage.price} Now`}
                </Button>
              </LinearGradient>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  headerMainText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Modern Balance Card Styles
  balanceCard: {
    marginBottom: 24,
    borderRadius: 16,
    elevation: 4,
    padding: 16,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBalanceText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '500',
  },
  modernBalanceCard: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernBalanceContent: {
    padding: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceIconContainer: {
    marginRight: 16,
  },
  balanceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  balanceTitleContainer: {
    flex: 1,
  },
  modernBalanceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  upgradeButton: {
    borderRadius: 20,
    elevation: 2,
  },
  upgradeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modernGlobalBalance: {
    alignItems: 'center',
  },
  balanceAmountContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modernBalanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  creditsLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  balanceStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  // Legacy Balance Styles
  legacyBalance: {
    marginTop: 16,
  },
  legacyBalanceLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: 12,
  },
  servicesContainer: {
    marginBottom: 16,
  },
  serviceItem: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginBottom: 6,
  },
  serviceProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceProgress: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginRight: 12,
  },
  serviceProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  serviceCredit: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    minWidth: 40,
  },
  migrateButtonGradient: {
    borderRadius: 25,
    elevation: 3,
  },
  migrateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Packages Section
  packagesSection: {
    marginBottom: 24,
  },
  packagesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a202c',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorCard: {
    marginVertical: 16,
    backgroundColor: '#fee',
    borderRadius: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#e53e3e',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  // Purchase Section
  purchaseSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  selectedPackageCard: {
    borderRadius: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  selectedPackageContent: {
    padding: 20,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  selectedDetails: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savingsText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  purchaseButtonGradient: {
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  purchaseButtonContent: {
    paddingVertical: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSpacing: {
    height: 40,
  },

  // Free Credits Section
  freeCreditsSection: {
    marginVertical: 20,
  },
  freeCreditsCard: {
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E1E8FF',
  },
  freeCreditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  freeCreditsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  freeCreditsTextContainer: {
    flex: 1,
  },
  freeCreditsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  freeCreditsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  freeCreditsDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  freeCreditsActions: {
    alignItems: 'center',
  },
  rewardButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  freeCreditsButton: {
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  freeCreditsStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Divider Section
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerTextContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Purchase Section Header
  purchaseSectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  purchaseSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  purchaseSectionSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default CreditPurchaseScreen;