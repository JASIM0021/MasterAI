import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Appbar,
  ActivityIndicator,
  Button,
  Card,
} from 'react-native-paper';
import { WebView } from 'react-native-webview';

const PaymentWebView = ({ paymentData, onComplete, onCancel }) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel the payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: onCancel },
      ]
    );
    return true;
  };

  const generatePaymentHTML = () => {
    const { paymentUrl, paymentParams } = paymentData;

    let formFields = '';
    Object.keys(paymentParams).forEach(key => {
      if (paymentParams[key] !== null && paymentParams[key] !== undefined) {
        formFields += `<input type="hidden" name="${key}" value="${paymentParams[key]}" />`;
      }
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Gateway</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
              width: 100%;
            }
            .logo {
              width: 60px;
              height: 60px;
              background: #007bff;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              color: white;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
              font-size: 24px;
            }
            p {
              color: #666;
              margin-bottom: 25px;
              line-height: 1.5;
            }
            .loader {
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #007bff;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .amount {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
              margin: 15px 0;
            }
            .package-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            }
            .package-name {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .credits {
              color: #28a745;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">💳</div>
            <h2>Redirecting to Payment Gateway</h2>
            <p>Please wait while we redirect you to PayU secure payment gateway.</p>

            <div class="package-info">
              <div class="package-name">${paymentData.packageDetails.name}</div>
              <div class="credits">${paymentData.packageDetails.totalCredits} Credits</div>
            </div>

            <div class="amount">₹${paymentData.packageDetails.price}</div>

            <div class="loader"></div>
            <p style="font-size: 12px; color: #999;">
              Your payment is secured by PayU
            </p>
          </div>

          <form id="payuForm" method="post" action="${paymentUrl}">
            ${formFields}
          </form>

          <script>
            setTimeout(function() {
              document.getElementById('payuForm').submit();
            }, 2000);
          </script>
        </body>
      </html>
    `;
  };

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    setCurrentUrl(url);

    // Check for payment completion URLs
    if (url.includes('/payment/success') || url.includes('/payments/success')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const status = urlParams.get('status');
      const txnid = urlParams.get('txnid');
      const mihpayid = urlParams.get('mihpayid');

      if (status === 'success') {
        onComplete(true, {
          status,
          txnid,
          mihpayid,
          message: 'Payment completed successfully'
        });
      }
    } else if (url.includes('/payment/failure') || url.includes('/payments/failure')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const error = urlParams.get('error') || 'Payment failed';
      const txnid = urlParams.get('txnid');

      onComplete(false, {
        status: 'failed',
        txnid,
        message: error
      });
    } else if (url.includes('/payment/cancel') || url.includes('/payments/cancel')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const txnid = urlParams.get('txnid');

      onComplete(false, {
        status: 'cancelled',
        txnid,
        message: 'Payment was cancelled'
      });
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('Failed to load payment page');
    setLoading(false);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_RESULT') {
        onComplete(data.success, data);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onCancel} />
          <Appbar.Content title="Payment" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorTitle}>Payment Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Button
                mode="contained"
                onPress={onCancel}
                style={styles.errorButton}
              >
                Go Back
              </Button>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleBackPress} />
        <Appbar.Content title="Payment Gateway" />
      </Appbar.Header>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading payment gateway...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: generatePaymentHTML() }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleError}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={false}
        mixedContentMode="compatibility"
        userAgent={Platform.OS === 'android'
          ? 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
          : 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#f44336',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  errorButton: {
    marginTop: 8,
  },
});

export default PaymentWebView;